import React, { createContext, useContext, useMemo, useState } from 'react';

export const DEFAULT_TIME_ZONE = 'America/Chicago';

export const TIME_ZONE_OPTIONS = [
  { value: 'America/Chicago', label: 'Central time' },
  { value: 'America/New_York', label: 'Eastern time' },
  { value: 'America/Denver', label: 'Mountain time' },
  { value: 'America/Los_Angeles', label: 'Pacific time' },
] as const;

type TimeZoneContextValue = {
  timeZone: string;
  setTimeZone: (value: string) => void;
};

const TimeZoneContext = createContext<TimeZoneContextValue>({
  timeZone: DEFAULT_TIME_ZONE,
  setTimeZone: () => {},
});

export function TimeZoneProvider({ children }: { children: React.ReactNode }) {
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
  const value = useMemo(() => ({ timeZone, setTimeZone }), [timeZone]);

  return (
    <TimeZoneContext.Provider value={value}>
      {children}
    </TimeZoneContext.Provider>
  );
}

export function useTimeZone() {
  return useContext(TimeZoneContext);
}
