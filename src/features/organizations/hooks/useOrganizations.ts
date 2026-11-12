import { useState, useCallback } from 'react';
import {
  organizationService,
  OrganizationRow,
  OrganizationMemberRow,
  OrgRole,
  OrgMemberStatus,
} from '../services/organizationService';

export function useOrganizations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganizations = useCallback(async (options?: { limit?: number; offset?: number }) => {
    setLoading(true);
    setError(null);
    try {
      return await organizationService.getOrganizations(options);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrganizationById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await organizationService.getOrganizationById(id);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async (organizationId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await organizationService.getMembers(organizationId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingMembers = useCallback(async (organizationId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await organizationService.getPendingMembers(organizationId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyMembership = useCallback(async (organizationId: string, userId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await organizationService.getMyMembership(organizationId, userId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinOrganization = useCallback(async (organizationId: string, userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await organizationService.joinOrganization(organizationId, userId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const leaveOrganization = useCallback(async (organizationId: string, userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await organizationService.leaveOrganization(organizationId, userId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setMemberStatus = useCallback(async (memberId: string, status: OrgMemberStatus) => {
    setLoading(true);
    setError(null);
    try {
      await organizationService.setMemberStatus(memberId, status);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setMemberRole = useCallback(async (memberId: string, role: OrgRole) => {
    setLoading(true);
    setError(null);
    try {
      await organizationService.setMemberRole(memberId, role);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchOrganizations,
    fetchOrganizationById,
    fetchMembers,
    fetchPendingMembers,
    fetchMyMembership,
    joinOrganization,
    leaveOrganization,
    setMemberStatus,
    setMemberRole,
  };
}
