// =====================================================
// WawléLearn — Configuration Supabase
// La clé "publishable" est PUBLIQUE par design :
// elle est faite pour le navigateur.
// La vraie sécurité vient des règles RLS côté base.
// INTERDIT ICI : clé sb_secret_..., mot de passe BDD.
// =====================================================
const SUPABASE_URL = "https://uhbbxoibysemjmsmshgs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wdDJOKho9Tw6fwdIvNcF7A_MRaxM6tP";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
