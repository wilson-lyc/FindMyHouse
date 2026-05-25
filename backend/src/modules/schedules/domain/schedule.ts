export interface Schedule {
  id: string;
  houseId: string;
  viewingAt: string;
  note?: string;
  houseName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleFilters {
  houseId?: string;
  dateFrom?: string;
  dateTo?: string;
}
