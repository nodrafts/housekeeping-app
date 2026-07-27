export type AuthStackParamList = {
  Login: undefined;
};

// Bottom tab param lists
export type StaffTabParamList = {
  Housekeeping: undefined;
  Schedule: undefined;
  Settings: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  Housekeeping: undefined;
  Schedule: undefined;
  Settings: undefined;
  Profile: undefined;
};

// Stack screens nested inside tabs (for drill-down)
export type AppStackParamList = {
  // Tab containers
  StaffTabs: undefined;
  AdminTabs: undefined;
  // Stack screens (pushed on top of tabs)
  RoomDetails: { assignmentId: string };
  HotelSelect: undefined;
  ReportIssue: { assignmentId: string };
  Messaging: undefined;
  Dashboard: undefined;
  RoomsList: undefined;
};
