export interface Address {
  id: number;
  userId: number;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressDTO {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
}

export type UpdateAddressDTO = Partial<CreateAddressDTO>;
