import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  formatDurationMinutes,
  formatTaskSchedule,
} from '@/features/intent-profile/format-task-schedule';
import { GoalPriorityBadge } from '@/features/intent-profile/goal-priority-control';
import type { GoalDraftTask } from '@/features/intent-profile/life-area-goals-types';

type LifeAreaGoalDraftTaskListProps = {
  tasks: GoalDraftTask[];
  onRemove: (localId: string) => void;
};

export function LifeAreaGoalDraftTaskList({ tasks, onRemove }: LifeAreaGoalDraftTaskListProps) {
  const { t } = useTranslation();
  if (tasks.length === 0) return null;

  return (
    <ul className="list-none space-y-2 p-0">
      {tasks.map((task) => {
        const durationLabel = formatDurationMinutes(task.durationMinutes, t);
        return (
          <li
            key={task.localId}
            className="flex items-start justify-between gap-2 rounded-xl border border-line-soft bg-bg/50 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-body text-sm font-medium text-ink">{task.title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <p className="font-body text-[11px] text-ink-3">
                  {formatTaskSchedule(task.schedule, t)}
                  {durationLabel ? ` · ${durationLabel}` : ''}
                </p>
                <GoalPriorityBadge priority={task.priority} compact />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onRemove(task.localId);
              }}
              className="shrink-0 text-ink-3 hover:text-ink"
              aria-label={t('you.lifeArea.assets.remove')}
            >
              <X className="size-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
