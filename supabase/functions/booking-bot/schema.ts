// Schema and TypeScript types for Dorogo Booking Copilot
export interface Stop {
  seq: number;
  kind: "pickup" | "dropoff";
  time: string | null;           // "14:50" (24h)
  time_approx: boolean;         // true if "~15:10"
  place: string;                // "Villa Lilla", "MXP T1"
  address: string | null;       // "Via Paolo Carcano 30, Bellagio"
  maps_url: string | null;      // Google Maps link if present
  lat: number | null;
  lng: number | null;
  instructions: string | null;  // "(Bus pulls over outside the main gate)"
  evidence: string;             // Exact verbatim quote from source
}

export interface FlightInfo {
  number: string;               // e.g. "LX1612", "AZ123"
  kind?: "arrival" | "departure";
  time?: string | null;
}

export interface ChildInfo {
  age: number | null;
  seat_type?: "infant_carrier" | "child_seat" | "booster" | "unknown";
}

export interface Ride {
  ride_no: number;
  role: "outbound" | "return" | "transfer";
  date: string;                 // YYYY-MM-DD
  end_date?: string;            // YYYY-MM-DD (if crosses midnight)
  time: string | null;          // First pickup time (HH:MM)
  end_time?: string | null;     // Final dropoff time (HH:MM)
  time_approx: boolean;
  est_minutes: number | null;   // e.g. 10, 25
  stops: Stop[];
  flight: FlightInfo | null;
  price: number | null;         // Allocated price for this specific ride
  balance_due?: number | null;  // Amount still to collect on this specific ride (per-leg split)
}

export interface ClientInfo {
  name: string | null;
  phone: string | null;         // E.164 formatted if possible
  email: string | null;
}

export interface PartyInfo {
  passengers: number | null;
  adults: number | null;
  children: ChildInfo[];
  luggage: number | null;
  ski_bags: number | null;
}

export interface VehicleInfo {
  class: string | null;         // "Mercedes-Benz V-Class", "E-Class", "S-Class", "Bus"
  count: number;
}

export interface FinanceInfo {
  total_price: number | null;
  paid_deposit: number | null;
  balance_due: number | null;
  payment_method: string | null; // "cash_to_driver", "bank_transfer", "card", "stripe"
  suggested_price?: number | null;
  is_suggested?: boolean;
}

export interface BookingData {
  booking_ref: string;          // e.g. DRG-XXXXXX
  booked_date: string;          // YYYY-MM-DD (e.g. 2026-10-21)
  booked_month: string;         // e.g. "October 2026"
  status: string;               // "Prepayment Received", "Confirmed (Unpaid)", "Transfer Complete"
  service_type: string;         // "Airport Transfer", "City To City", "Mountain Transfer", etc.
  standby_hours?: number | null; // e.g. 10 for 10-hour standby
  client: ClientInfo;
  party: PartyInfo;
  vehicle: VehicleInfo;
  rides: Ride[];
  finance: FinanceInfo;
  client_notes: string;
  our_notes: string;
  evidence: Record<string, string>; // field -> verbatim source quote
  missing_fields: string[];     // User-facing list of missing critical fields
  warnings: string[];
}

/**
 * Gemini JSON schema for strictly typed extraction
 */
export const GEMINI_BOOKING_SCHEMA = {
  type: "OBJECT",
  properties: {
    client_name: { type: "STRING", nullable: true },
    client_phone: { type: "STRING", nullable: true },
    client_email: { type: "STRING", nullable: true },
    service_type: { type: "STRING", nullable: true },
    standby_hours: {
      type: "NUMBER",
      description: "Total number of hours for standby / disposal / hourly service (e.g. 10 for 10 hours, 8 for 8 hours). Null if standard transfer.",
      nullable: true,
    },
    vehicle_class: { type: "STRING", nullable: true },
    vehicle_count: { type: "INTEGER", nullable: true },
    passengers: { type: "INTEGER", nullable: true },
    adults: { type: "INTEGER", nullable: true },
    children: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          age: { type: "INTEGER", nullable: true },
          details: { type: "STRING", nullable: true },
        },
      },
    },
    luggage: { type: "INTEGER", nullable: true },
    ski_bags: { type: "INTEGER", nullable: true },
    price_total: { type: "NUMBER", nullable: true },
    paid_deposit: { type: "NUMBER", nullable: true },
    payment_method: { type: "STRING", nullable: true },
    raw_date: { type: "STRING", nullable: true },
    rides: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          ride_no: { type: "INTEGER" },
          role: { type: "STRING", enum: ["outbound", "return", "transfer"] },
          raw_date: { type: "STRING", nullable: true },
          est_duration_min: { type: "INTEGER", nullable: true },
          flight_number: { type: "STRING", nullable: true },
          flight_kind: { type: "STRING", enum: ["arrival", "departure"], nullable: true },
          flight_time: { type: "STRING", nullable: true },
          stops: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                seq: { type: "INTEGER" },
                kind: { type: "STRING", enum: ["pickup", "dropoff"] },
                time: { type: "STRING", nullable: true },
                time_approx: { type: "BOOLEAN" },
                place: { type: "STRING" },
                address: { type: "STRING", nullable: true },
                maps_url: { type: "STRING", nullable: true },
                instructions: { type: "STRING", nullable: true },
                evidence: { type: "STRING" },
              },
              required: ["seq", "kind", "place", "time_approx", "evidence"],
            },
          },
        },
        required: ["ride_no", "role", "stops"],
      },
    },
    client_notes: { type: "STRING", nullable: true },
    evidence_map: {
      type: "OBJECT",
      properties: {
        client_name: { type: "STRING", nullable: true },
        client_phone: { type: "STRING", nullable: true },
        price_total: { type: "STRING", nullable: true },
        paid_deposit: { type: "STRING", nullable: true },
      },
    },
  },
  required: ["rides"],
};
