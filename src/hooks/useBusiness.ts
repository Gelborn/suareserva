// src/hooks/useBusiness.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Business {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  timezone: string;
  created_by: string | null;
  created_at: string;
  updated_at?: string | null;
}

/**
 * Busca o primeiro business do usuário pela ordem de criação.
 * Estratégia simples e previsível:
 *  1) tenta por created_by = userId
 *  2) se não achar, tenta via membership (business_members → business_id)
 *
 * RLS necessárias:
 *  - SELECT em businesses quando created_by = auth.uid() OU usuário é membro
 *  - SELECT em business_members para linhas do próprio user_id
 */
async function fetchUserBusiness(userId: string): Promise<Business | null> {
  // 1) por created_by
  {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, contact_email, contact_phone, timezone, created_by, created_at, updated_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error && data) return data as Business;
    // se erro, tenta o caminho 2 mesmo assim
  }

  // 2) por membership
  const { data: mm, error: mmErr } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', userId)
    .order('invited_at', { ascending: true })
    .limit(1);

  if (mmErr) return null;

  const bizId = mm?.[0]?.business_id as string | undefined;
  if (!bizId) return null;

  const { data: biz, error: bizErr } = await supabase
    .from('businesses')
    .select('id, name, contact_email, contact_phone, timezone, created_by, created_at, updated_at')
    .eq('id', bizId)
    .maybeSingle();

  if (bizErr) return null;
  return (biz as Business) ?? null;
}

export function useBusiness() {
  const { user, isAuthenticated } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState<boolean>(!!isAuthenticated);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setBusiness(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const biz = await fetchUserBusiness(user.id);
      setBusiness(biz);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar negócio');
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    // carrega quando autentica / troca usuário
    load();
  }, [load]);

  return { business, loading, error, refetch: load };
}
