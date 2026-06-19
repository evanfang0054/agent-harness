export type BannerLinkType = 'none' | 'product' | 'category' | 'external';

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  image: string | null;
  ctaText: string | null;
  linkType: BannerLinkType;
  linkValue: string | null;
  sortOrder: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerDTO {
  title: string;
  subtitle?: string;
  image?: string;
  ctaText?: string;
  linkType?: BannerLinkType;
  linkValue?: string;
  sortOrder?: number;
  status?: number;
}

export type UpdateBannerDTO = Partial<CreateBannerDTO>;
