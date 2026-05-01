import type { ResourceKey } from '@/shared/constants/permission.constants';

export type NavigationItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
  order: number;
  resourceKey: ResourceKey;
  parentResourceKey?: ResourceKey;
  children?: NavigationItem[];
};
