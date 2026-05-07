export type QuestStatus =
  | 'active'
  | 'completed'
  | 'frozen'
  | 'forgotten'
  | 'available'

export type QuestType = {
  id: string
  type: 'team' | 'private'
  title: string
  description: string
  status: QuestStatus
}