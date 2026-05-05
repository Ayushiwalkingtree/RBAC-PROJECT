import { z } from 'zod';
import { ADMIN_RESOURCE_TYPES } from '@/shared/constants/permission.constants';

const permissionDefinitionSchema = z.object({
  key: z.string().min(1, 'Select at least one action.'),
  label: z.string().min(1),
});

export const resourceSchema = z.object({
  resource_key: z.string().optional(),
  resource_name: z.string().min(2, 'Resource name is required.'),
  resource_type: z.enum(ADMIN_RESOURCE_TYPES),
  resource_group: z.string().min(2, 'Module is required.'),
  description: z.string().optional(),
  sequence_no: z.coerce.number().optional(),
  parent_resource_key: z.string().optional(),
  ui_path: z.string().optional(),
  http_method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().or(z.literal('')),
  api_path: z.string().optional(),
  microservice: z.string().optional(),
  is_ui_visible: z.boolean(),
  is_active: z.boolean(),
  allowed_permissions: z.array(permissionDefinitionSchema).min(1, 'Select at least one action.'),
});

export type ResourceFormValues = z.infer<typeof resourceSchema>;
