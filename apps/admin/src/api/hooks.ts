import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Categorie,
  ContenuQuestion,
  EntreeHistorique,
  Format,
  MiseAJourQuestion,
  Prompt,
  PromptVersion,
  QuestionAffichee,
  Reglages,
  Relecture,
  SousCategorie,
  Statut,
} from '@changing-world/shared';
import { api } from './client';

/* ---------- Types des réponses ---------- */

export interface Session {
  connecte: boolean;
  demo: boolean;
}

export interface CategorieAvecSous extends Categorie {
  sous_categories: SousCategorie[];
}

export interface Taxonomie {
  categories: CategorieAvecSous[];
}

export interface Compteurs {
  parStatut: Record<Statut, number>;
  total: number;
  parSousCategorie: {
    id: number;
    nom: string;
    categorie_id: number;
    categorie_nom: string;
    categorie_couleur: string;
    cible: number | null;
    total: number;
    validees: number;
    en_cours: number;
  }[];
}

export interface Intitule {
  id: number;
  numero: number;
  question: string;
  sous_categorie_id: number;
}

export interface PromptListe extends Prompt {
  format_nom: string | null;
  format_code: string | null;
  format_actif: boolean | null;
  version_active: { id: number; version: number; created_at: string } | null;
  nb_versions: number;
  derniere_modification: string;
  nb_questions: number;
}

export interface PromptVersionDetail extends PromptVersion {
  nb_questions_generees: number;
}

export interface PromptDetail {
  prompt: Prompt;
  format: Format | null;
  versions: PromptVersionDetail[];
  variables: readonly { nom: string; description: string }[];
}

export interface FiltresQuestions {
  statut?: string;
  categorie_id?: string;
  sous_categorie_id?: string;
  format_id?: string;
  impact?: string;
  q?: string;
}

export interface ResultatLien {
  etat: 'ok' | 'ko';
  statut: number | null;
  detail: string;
}

/* ---------- Clés ---------- */

export const cles = {
  session: ['session'] as const,
  questions: (filtres: FiltresQuestions) => ['questions', filtres] as const,
  question: (id: number) => ['question', id] as const,
  historique: (id: number) => ['historique', id] as const,
  compteurs: ['compteurs'] as const,
  intitules: ['intitules'] as const,
  taxonomie: ['taxonomie'] as const,
  formats: ['formats'] as const,
  prompts: ['prompts'] as const,
  prompt: (id: number) => ['prompt', id] as const,
  reglages: ['reglages'] as const,
};

/* ---------- Session ---------- */

export function useSession() {
  return useQuery({
    queryKey: cles.session,
    queryFn: () => api<Session>('/api/auth/session'),
    staleTime: 60_000,
  });
}

export function useConnexion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mot_de_passe: string) => api<{ ok: boolean }>('/api/auth/login', { method: 'POST', json: { mot_de_passe } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: cles.session }),
  });
}

export function useDeconnexion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData<Session>(cles.session, (s) => ({ demo: s?.demo ?? false, connecte: false }));
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
    },
  });
}

/* ---------- Questions ---------- */

function queryString(filtres: FiltresQuestions): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filtres)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function useQuestions(filtres: FiltresQuestions) {
  return useQuery({
    queryKey: cles.questions(filtres),
    queryFn: () => api<{ questions: QuestionAffichee[] }>(`/api/admin/questions${queryString(filtres)}`).then((r) => r.questions),
  });
}

export function useCompteurs() {
  return useQuery({ queryKey: cles.compteurs, queryFn: () => api<Compteurs>('/api/admin/questions/compteurs') });
}

export function useIntitules() {
  return useQuery({
    queryKey: cles.intitules,
    queryFn: () => api<{ intitules: Intitule[] }>('/api/admin/questions/intitules').then((r) => r.intitules),
  });
}

export function useQuestion(id: number | null) {
  return useQuery({
    queryKey: cles.question(id ?? 0),
    queryFn: () => api<{ question: QuestionAffichee }>(`/api/admin/questions/${id}`).then((r) => r.question),
    enabled: id !== null && id > 0,
  });
}

export function useHistorique(id: number | null) {
  return useQuery({
    queryKey: cles.historique(id ?? 0),
    queryFn: () => api<{ historique: EntreeHistorique[] }>(`/api/admin/questions/${id}/historique`).then((r) => r.historique),
    enabled: id !== null && id > 0,
  });
}

export function useInvaliderQuestion() {
  const qc = useQueryClient();
  return (id: number, question?: QuestionAffichee) => {
    if (question) qc.setQueryData(cles.question(id), question);
    void qc.invalidateQueries({ queryKey: ['questions'] });
    void qc.invalidateQueries({ queryKey: cles.compteurs });
    void qc.invalidateQueries({ queryKey: cles.intitules });
    void qc.invalidateQueries({ queryKey: cles.historique(id) });
  };
}

export function useCreerQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (corps: { categorie_id?: number | null; sous_categorie_id?: number | null; format_id?: number | null }) =>
      api<{ question: QuestionAffichee }>('/api/admin/questions', { method: 'POST', json: corps }).then((r) => r.question),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['questions'] });
      void qc.invalidateQueries({ queryKey: cles.compteurs });
    },
  });
}

export function useEnregistrerQuestion(id: number) {
  const invalider = useInvaliderQuestion();
  return useMutation({
    mutationFn: (corps: MiseAJourQuestion) =>
      api<{ question: QuestionAffichee }>(`/api/admin/questions/${id}`, { method: 'PUT', json: corps }).then((r) => r.question),
    onSuccess: (q) => invalider(id, q),
  });
}

export function useChangerStatut(id: number) {
  const invalider = useInvaliderQuestion();
  return useMutation({
    mutationFn: (corps: { statut: Statut; commentaire_interne?: string | null }) =>
      api<{ question: QuestionAffichee }>(`/api/admin/questions/${id}/statut`, { method: 'POST', json: corps }).then((r) => r.question),
    onSuccess: (q) => invalider(id, q),
  });
}

export function useRestaurer(id: number) {
  const invalider = useInvaliderQuestion();
  return useMutation({
    mutationFn: (histId: number) =>
      api<{ question: QuestionAffichee }>(`/api/admin/questions/${id}/restaurer/${histId}`, { method: 'POST' }).then((r) => r.question),
    onSuccess: (q) => invalider(id, q),
  });
}

export function useSupprimerQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<{ ok: boolean }>(`/api/admin/questions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['questions'] });
      void qc.invalidateQueries({ queryKey: cles.compteurs });
    },
  });
}

export function useRelecture(id: number) {
  return useMutation({
    mutationFn: (contenu: ContenuQuestion) => api<Relecture>(`/api/admin/questions/${id}/relecture`, { method: 'POST', json: contenu }),
  });
}

export function useVerifierLien() {
  return useMutation({
    mutationFn: (url: string) => api<ResultatLien>('/api/admin/outils/verifier-lien', { method: 'POST', json: { url } }),
  });
}

/* ---------- Taxonomie, formats, prompts, réglages ---------- */

export function useTaxonomie() {
  return useQuery({ queryKey: cles.taxonomie, queryFn: () => api<Taxonomie>('/api/admin/taxonomie'), staleTime: 60_000 });
}

export function useFormats() {
  return useQuery({
    queryKey: cles.formats,
    queryFn: () => api<{ formats: Format[] }>('/api/admin/formats').then((r) => r.formats),
    staleTime: 60_000,
  });
}

export function usePrompts() {
  return useQuery({
    queryKey: cles.prompts,
    queryFn: () => api<{ prompts: PromptListe[] }>('/api/admin/prompts').then((r) => r.prompts),
  });
}

export function usePrompt(id: number | null) {
  return useQuery({
    queryKey: cles.prompt(id ?? 0),
    queryFn: () => api<PromptDetail>(`/api/admin/prompts/${id}`),
    enabled: id !== null && id > 0,
  });
}

export function useNouvelleVersion(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (corps: { contenu: string; note_de_version?: string }) =>
      api<{ version: PromptVersion }>(`/api/admin/prompts/${id}/versions`, { method: 'POST', json: corps }).then((r) => r.version),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: cles.prompt(id) });
      void qc.invalidateQueries({ queryKey: cles.prompts });
    },
  });
}

export function useActiverVersion(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vid: number) => api<{ ok: boolean }>(`/api/admin/prompts/${id}/versions/${vid}/activer`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: cles.prompt(id) });
      void qc.invalidateQueries({ queryKey: cles.prompts });
    },
  });
}

export function useReglages() {
  return useQuery({
    queryKey: cles.reglages,
    queryFn: () => api<{ reglages: Reglages; ia: { mode: 'openai' | 'demo'; modele_env: string } }>('/api/admin/reglages'),
    staleTime: 60_000,
  });
}

export function useEnregistrerReglages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (corps: Reglages) => api<{ reglages: Reglages }>('/api/admin/reglages', { method: 'PUT', json: corps }),
    onSuccess: () => qc.invalidateQueries({ queryKey: cles.reglages }),
  });
}

/** Mutation générique pour les écrans CRUD de Réglages (taxonomie et formats). */
export function useMutationGenerique<TEntree>(invalider: readonly (readonly unknown[])[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chemin, methode, json }: { chemin: string; methode: 'POST' | 'PUT' | 'DELETE'; json?: TEntree }) =>
      api<unknown>(chemin, { method: methode, json }),
    onSuccess: () => {
      for (const cle of invalider) void qc.invalidateQueries({ queryKey: cle });
    },
  });
}
