import type { ResourceKey, ResourceType } from '@/shared/constants/permission.constants';

export type NavigationItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
  type: ResourceType;
  sequenceNo: number;
  order: number;
  resourceKey: ResourceKey;
  parentResourceKey?: ResourceKey;
  children?: NavigationItem[];
};
