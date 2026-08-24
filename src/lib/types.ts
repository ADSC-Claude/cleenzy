/** Hand-written mirrors of the database enums and row shapes. */

export type UserRole =
  | "owner" | "manager" | "laundry_staff" | "cashier" | "rider" | "customer";

export type ServiceUnit = "per_kg" | "per_piece" | "per_pair" | "per_load";
export type OrderType = "pickup_delivery" | "dropoff";

export type OrderStatus =
  | "placed" | "pickup_scheduled" | "picked_up" | "received" | "sorting"
  | "washing" | "drying" | "folding" | "quality_check" | "packed" | "ready"
  | "out_for_delivery" | "completed" | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
export type PaymentMethod = "cash" | "gcash" | "bank_transfer" | "card";
export type TaskType = "pickup" | "delivery";
export type TaskStatus = "assigned" | "en_route" | "picked_up" | "delivered" | "failed";

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  unit: ServiceUnit;
  turnaround_hours: number;
  min_quantity: number;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface TimeSlot {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  slot_type: "pickup" | "delivery" | "both";
  capacity: number;
  is_active: boolean;
  sort_order: number;
}

export interface ServiceArea {
  id: string;
  name: string;
  city: string;
  pickup_fee: number;
  delivery_fee: number;
  min_order_amount: number;
  free_delivery_over: number | null;
  is_active: boolean;
}

export interface Address {
  id: string;
  customer_id: string | null;
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  barangay: string | null;
  city: string;
  province: string | null;
  postal_code: string | null;
  landmark: string | null;
  notes: string | null;
  service_area_id: string | null;
  is_default: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  service_id: string | null;
  service_name: string;
  unit: ServiceUnit;
  unit_price: number;
  quantity: number;
  actual_quantity: number | null;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  order_type: OrderType;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  pickup_date: string | null;
  pickup_slot_id: string | null;
  pickup_address_id: string | null;
  delivery_date: string | null;
  delivery_slot_id: string | null;
  delivery_address_id: string | null;
  service_area_id: string | null;
  estimated_weight_kg: number | null;
  actual_weight_kg: number | null;
  subtotal: number;
  pickup_fee: number;
  delivery_fee: number;
  additional_charges: number;
  charges_reason: string | null;
  discount_amount: number;
  discount_reason: string | null;
  total_amount: number;
  amount_paid: number;
  assigned_staff_id: string | null;
  assigned_rider_id: string | null;
  notes: string | null;
  internal_notes: string | null;
  placed_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  reference_number: string | null;
  received_by: string | null;
  paid_at: string;
  notes: string | null;
}

export interface DeliveryTask {
  id: string;
  order_id: string;
  task_type: TaskType;
  rider_id: string | null;
  scheduled_date: string | null;
  slot_id: string | null;
  address_id: string | null;
  status: TaskStatus;
  cod_amount: number;
  sequence: number;
  notes: string | null;
  completed_at: string | null;
}

export interface StatusHistoryEntry {
  to_status: OrderStatus;
  created_at: string;
  note: string | null;
}

/** Shape returned by the public.track_order RPC. */
export interface TrackedOrder {
  order_number: string;
  status: OrderStatus;
  order_type: OrderType;
  customer_name: string;
  payment_status: PaymentStatus;
  total_amount: number;
  placed_at: string;
  pickup_date: string | null;
  delivery_date: string | null;
  estimated_weight_kg: number | null;
  actual_weight_kg: number | null;
  items: Array<{
    service_name: string; quantity: number; unit: ServiceUnit; line_total: number;
  }>;
  history: StatusHistoryEntry[];
}
