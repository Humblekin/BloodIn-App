-- BloodIn — Community membership lifecycle fixes
--
-- Addresses:
--   * member_count was never maintained (stayed at 0 / seed value).
--   * Regular members could not leave (UPDATE was moderator-only) and users who
--     left could not rejoin.
--   * Clients could insert themselves as active/admin, bypassing join_policy.
--   * Moderators could escalate themselves/others to admin.
--
-- RLS grants row access; the guard triggers below enforce the per-column
-- role/status rules that RLS cannot express.

-- ── 1. Accurate member_count ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recount_community_members(p_community_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.communities
  SET member_count = (
    SELECT COUNT(*)
    FROM public.community_members
    WHERE community_id = p_community_id
      AND status = 'active'
  )
  WHERE id = p_community_id;
$$;

CREATE OR REPLACE FUNCTION public.sync_community_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recount_community_members(OLD.community_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.recount_community_members(OLD.community_id);
    IF NEW.community_id IS DISTINCT FROM OLD.community_id THEN
      PERFORM public.recount_community_members(NEW.community_id);
    END IF;
  ELSE
    PERFORM public.recount_community_members(NEW.community_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_community_member_count ON public.community_members;
CREATE TRIGGER sync_community_member_count
  AFTER INSERT OR DELETE OR UPDATE OF status, community_id
  ON public.community_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_community_member_count();

-- Backfill existing counts.
UPDATE public.communities c
SET member_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT community_id, COUNT(*) FILTER (WHERE status = 'active') AS cnt
  FROM public.community_members
  GROUP BY community_id
) sub
WHERE c.id = sub.community_id;

UPDATE public.communities c
SET member_count = 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.community_members m WHERE m.community_id = c.id
);

-- ── 2. Join guard: enforce role + status from join_policy ───────────────────
CREATE OR REPLACE FUNCTION public.guard_community_member_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy TEXT;
  v_creator UUID;
BEGIN
  -- Service-role / migration context: trusted, leave the row untouched.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only join as yourself';
  END IF;

  SELECT join_policy, created_by INTO v_policy, v_creator
  FROM public.communities
  WHERE id = NEW.community_id;

  -- The community creator is seeded as an active admin.
  IF NEW.user_id = v_creator AND NEW.role = 'admin' THEN
    NEW.status := 'active';
    RETURN NEW;
  END IF;

  -- Everyone else joins as a member, status dictated by the join policy.
  NEW.role := 'member';
  NEW.status := CASE WHEN v_policy = 'open' THEN 'active' ELSE 'pending' END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_community_member_insert ON public.community_members;
CREATE TRIGGER guard_community_member_insert
  BEFORE INSERT ON public.community_members
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_community_member_insert();

-- ── 3. Update guard: leave, rejoin, approve, promote, demote ────────────────
CREATE OR REPLACE FUNCTION public.guard_community_member_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_role TEXT;
  v_is_self BOOLEAN;
BEGIN
  -- Service-role / migration context: trusted, leave the row untouched.
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_self := (NEW.user_id = v_actor);

  SELECT role INTO v_actor_role
  FROM public.community_members
  WHERE community_id = NEW.community_id
    AND user_id = v_actor
    AND status = 'active';

  IF v_is_self THEN
    -- Leaving: status -> left, demoted to member.
    IF NEW.status = 'left' AND NEW.role = 'member'
       AND NEW.community_id IS NOT DISTINCT FROM OLD.community_id
       AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
      RETURN NEW;
    END IF;

    -- Rejoining a previously-left membership as a regular member.
    IF OLD.status = 'left' AND NEW.status IN ('active', 'pending') AND NEW.role = 'member'
       AND NEW.community_id IS NOT DISTINCT FROM OLD.community_id
       AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
      RETURN NEW;
    END IF;

    -- Any other self-update requires an active moderator/admin role.
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'moderator') THEN
      RAISE EXCEPTION 'You can only leave or rejoin the community';
    END IF;

    -- Even moderators/admins cannot change their own role.
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'You cannot change your own role';
    END IF;
  END IF;

  -- The actor must be an active moderator/admin of this community.
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Only community moderators can manage members';
  END IF;

  -- Only admins may grant/revoke admin or touch an admin row.
  IF v_actor_role <> 'admin' AND (OLD.role = 'admin' OR NEW.role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage admin roles';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_community_member_update ON public.community_members;
CREATE TRIGGER guard_community_member_update
  BEFORE UPDATE ON public.community_members
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_community_member_update();

-- ── 4. RLS: let members update their own row (leave / rejoin) ───────────────
DROP POLICY IF EXISTS "Members can update own membership" ON public.community_members;
CREATE POLICY "Members can update own membership"
  ON public.community_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
