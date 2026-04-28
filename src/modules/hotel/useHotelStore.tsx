import React, { createContext, useContext, useState } from 'react';

export type Hotel = {
  hotelCode: string;
  name: string;
};

type HotelContextType = {
  selectedHotel: Hotel | null;
  setSelectedHotel: (hotel: Hotel) => void;
};

const HotelContext = createContext<HotelContextType>({
  selectedHotel: null,
  setSelectedHotel: () => {},
});

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  return (
    <HotelContext.Provider value={{ selectedHotel, setSelectedHotel }}>
      {children}
    </HotelContext.Provider>
  );
}

export function useHotelStore() {
  return useContext(HotelContext);
}
