export type AuthStackParamList = {
  Login: undefined;
};

// Bottom tab param lists
export type StaffTabParamList = {
  Home: undefined;
  Messages: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Rooms: undefined;
  Messages: undefined;
  Profile: undefined;
  Settings: undefined;
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
