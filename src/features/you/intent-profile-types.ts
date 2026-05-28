export type IntentProfile = {
  userId: string;
  displayName: string | null;
  roleContext: string | null;
  aspirations: string | null;
  strengths: string | null;
  weaknesses: string | null;
  valuesList: string[] | null;
  activeFocus: string | null;
  notes: string | null;
  longTermSummary: string | null;
  longTermSummaryAt: string | null;
  longTermSummaryMsgCount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type IntentProfileRow = {
  user_id: string;
  display_name: string | null;
  role_context: string | null;
  aspirations: string | null;
  strengths: string | null;
  weaknesses: string | null;
  values_list: string[] | string | null;
  active_focus: string | null;
  notes: string | null;
  long_term_summary: string | null;
  long_term_summary_at: string | null;
  long_term_summary_msg_count: number | null;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeValuesList(value: IntentProfileRow['values_list']): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const normalized = value.filter((item): item is string => typeof item === 'string');
    return normalized.length > 0 ? normalized : null;
  }
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) return null;
      const normalized = parsed.filter((item): item is string => typeof item === 'string');
      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function mapRowToProfile(row: IntentProfileRow): IntentProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    roleContext: row.role_context,
    aspirations: row.aspirations,
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    valuesList: normalizeValuesList(row.values_list),
    activeFocus: row.active_focus,
    notes: row.notes,
    longTermSummary: row.long_term_summary,
    longTermSummaryAt: row.long_term_summary_at,
    longTermSummaryMsgCount: row.long_term_summary_msg_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
