import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/layout/Screen';
import { Icon } from '../components/ui/Icon';
import { colors, radii } from '../lib/theme';
import { useAuth } from '../modules/auth/useAuth';
import { finalizeTaskChecklist, setTaskChecklistItemCompleted } from '../modules/tasks/checklist';
import { useComplianceJob, useUpdateComplianceJob } from '../modules/tasks/complianceApi';
import type { TaskChecklistItem, TaskPriority, TaskStatus } from '../modules/tasks/types';
import { useHotelStore } from '../modules/hotel/useHotelStore';
import { DEFAULT_HOTEL_CODE } from '../lib/propertyConfig';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ComplianceTaskDetails'>;

const FINISHED_STATUSES = new Set<TaskStatus>(['COMPLETED', 'DONE', 'CANCELLED', 'CLOSED']);

function formatDate(value: string | number | null | undefined, language: string) {
  if (value == null) return null;
  const normalized = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(language.startsWith('es') ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusTranslationKey(status: TaskStatus) {
  if (FINISHED_STATUSES.has(status)) return 'completed';
  if (status === 'SUBMITTED') return 'submitted';
  return status === 'IN_PROGRESS' ? 'inProgress' : 'open';
}

function priorityTranslationKey(priority: TaskPriority | undefined) {
  const normalized = String(priority ?? 'MEDIUM').toLowerCase();
  return ['low', 'medium', 'high', 'urgent'].includes(normalized) ? normalized : 'medium';
}

export function ComplianceTaskDetailsScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { selectedHotel } = useHotelStore();
  const { taskId } = route.params;
  const hotelCode = selectedHotel?.hotelCode ?? user?.hotelCode ?? DEFAULT_HOTEL_CODE;
  const taskQuery = useComplianceJob(taskId, hotelCode, user?.orgId);
  const updateTask = useUpdateComplianceJob(hotelCode, user?.orgId);
  const [localChecklist, setLocalChecklist] = useState<TaskChecklistItem[] | null>(null);

  useEffect(() => {
    if (taskQuery.data?.checklist) setLocalChecklist(taskQuery.data.checklist);
  }, [taskQuery.data?.id, taskQuery.data?.checklist]);

  const task = taskQuery.data;
  const checklist = useMemo(() => localChecklist ?? task?.checklist ?? [], [localChecklist, task?.checklist]);
  const completedCount = checklist.filter((item) => item.status === 'COMPLETED').length;
  const progress = checklist.length === 0 ? 0 : Math.round((completedCount / checklist.length) * 100);
  const isFinished = task ? FINISHED_STATUSES.has(task.status) : false;
  const isSubmitted = task?.status === 'SUBMITTED';
  const isLocked = isFinished || isSubmitted;

  const updateChecklist = (item: TaskChecklistItem) => {
    if (!task || isLocked || updateTask.isPending) return;
    const nextChecklist = setTaskChecklistItemCompleted(checklist, item.id, item.status !== 'COMPLETED');
    setLocalChecklist(nextChecklist);
    updateTask.mutate(
      {
        taskId: task.id,
        payload: {
          checklist: nextChecklist,
          ...(task.status === 'OPEN' ? { status: 'IN_PROGRESS' as const } : {}),
        },
      },
      {
        onSuccess: (updated) => setLocalChecklist(updated.checklist ?? nextChecklist),
        onError: () => {
          setLocalChecklist(task.checklist ?? []);
          Alert.alert(t('taskDetails.updateFailed'));
        },
      },
    );
  };

  const completeTask = () => {
    if (!task || isLocked || updateTask.isPending) return;
    const finalChecklist = finalizeTaskChecklist(checklist);
    setLocalChecklist(finalChecklist);
    updateTask.mutate(
      { taskId: task.id, payload: { status: 'SUBMITTED', checklist: finalChecklist } },
      {
        onSuccess: () => navigation.goBack(),
        onError: () => {
          setLocalChecklist(task.checklist ?? []);
          Alert.alert(t('taskDetails.updateFailed'));
        },
      },
    );
  };

  return (
    <Screen>
      <View style={{ minHeight: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary }}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.primaryForeground, fontSize: 32, lineHeight: 34 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ marginLeft: 4, color: colors.primaryForeground, fontSize: 18, fontWeight: '800' }}>{t('taskDetails.title')}</Text>
      </View>

      {taskQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>
      ) : taskQuery.isError || !task ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: colors.destructive, textAlign: 'center' }}>{t('taskDetails.loadFailed')}</Text>
          <TouchableOpacity onPress={() => taskQuery.refetch()} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.card, padding: 16 }}>
            <Text style={{ fontSize: 23, lineHeight: 29, fontWeight: '800', color: colors.foreground }}>{task.title}</Text>
            {task.description ? <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 21, color: colors.mutedForeground }}>{task.description}</Text> : null}
            <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <View style={{ borderRadius: radii.pill, backgroundColor: task.status === 'IN_PROGRESS' ? '#fef3c7' : isSubmitted ? '#dbeafe' : isFinished ? '#dcfce7' : colors.selected, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: task.status === 'IN_PROGRESS' ? '#92400e' : isSubmitted ? '#1d4ed8' : isFinished ? '#166534' : colors.primary }}>
                  {t(`taskStatus.${statusTranslationKey(task.status)}`)}
                </Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: task.priority === 'HIGH' || task.priority === 'URGENT' ? colors.destructive : colors.mutedForeground }}>
                {t(`taskPriority.${priorityTranslationKey(task.priority)}`)}
              </Text>
              {task.dueDate ? <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>{t('taskDetails.due', { date: formatDate(task.dueDate, i18n.resolvedLanguage ?? i18n.language) })}</Text> : null}
            </View>
          </View>

          <View style={{ marginTop: 18, marginBottom: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: colors.mutedForeground }}>{t('taskDetails.checklist')}</Text>
            {checklist.length > 0 ? <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{t('taskDetails.completedCount', { done: completedCount, total: checklist.length })}</Text> : null}
          </View>

          {checklist.length > 0 ? (
            <>
              <View style={{ marginBottom: 12, height: 7, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: colors.border }}>
                <View style={{ width: `${progress}%`, height: '100%', backgroundColor: isFinished ? colors.success : colors.primary }} />
              </View>
              {checklist.map((item, index) => {
                const done = item.status === 'COMPLETED';
                const skipped = item.status === 'SKIPPED';
                return (
                  <TouchableOpacity
                    key={`${item.id}-${index}`}
                    onPress={() => updateChecklist(item)}
                    disabled={isLocked || updateTask.isPending}
                    activeOpacity={0.75}
                    style={{ marginBottom: 10, minHeight: 68, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.card, padding: 16, opacity: isFinished && !done ? 0.7 : 1 }}
                  >
                    <View style={{ width: 26, height: 26, marginRight: 13, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: done ? colors.primary : colors.input, backgroundColor: done ? colors.primary : colors.card }}>
                      {done ? <Icon name="check" size={17} color={colors.primaryForeground} strokeWidth={3} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, lineHeight: 21, fontWeight: '700', color: skipped ? colors.mutedForeground : colors.foreground }}>{item.title}</Text>
                      {item.notes ? <Text style={{ marginTop: 3, fontSize: 12, lineHeight: 17, color: colors.mutedForeground }}>{item.notes}</Text> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.card, padding: 16 }}>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{t('taskDetails.noChecklist')}</Text>
            </View>
          )}

          {isFinished || isSubmitted ? (
            <View style={{ marginTop: 10, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: '#dcfce7' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#166534' }}>{t(isSubmitted ? 'taskDetails.submitted' : 'taskDetails.completed')}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={completeTask} disabled={updateTask.isPending} style={{ marginTop: 10, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radii.pill, backgroundColor: colors.primary, opacity: updateTask.isPending ? 0.55 : 1 }}>
              <Icon name="check" size={18} color={colors.primaryForeground} strokeWidth={2.5} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primaryForeground }}>{updateTask.isPending ? t('common.saving') : t('taskDetails.submit')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
