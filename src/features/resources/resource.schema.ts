import { z } from 'zod';
import { RESOURCE_TYPES } from '@/shared/constants/permission.constants';

const permissionDefinitionSchema = z.object({
  key: z.string().min(1, 'Permission key is required.'),
  label: z.string().min(1, 'Permission label is required.'),
});

export const resourceSchema = z
  .object({
    resource_key: z.string().min(2, 'Resource key is required.'),
    resource_name: z.string().min(2, 'Resource name is required.'),
    resource_type: z.enum([
      RESOURCE_TYPES.menu,
      RESOURCE_TYPES.api,
      RESOURCE_TYPES.button,
      RESOURCE_TYPES.action,
      RESOURCE_TYPES.report,
      RESOURCE_TYPES.dashboard,
    ]),
    resource_group: z.string().min(2, 'Resource group is required.'),
    description: z.string().min(3, 'Description is required.'),
    sequence_no: z.coerce.number().optional(),
    parent_resource_key: z.string().optional(),
    http_method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().or(z.literal('')),
    api_path: z.string().optional(),
    microservice: z.string().optional(),
    is_ui_visible: z.boolean(),
    is_active: z.boolean(),
    allowed_permissions: z.array(permissionDefinitionSchema).min(1, 'Add at least one permission.'),
  })
  .superRefine((value, context) => {
    if (value.resource_type === RESOURCE_TYPES.api) {
      if (!value.http_method) {
        context.addIssue({ code: 'custom', path: ['http_method'], message: 'API method is required.' });
      }
      if (!value.api_path) {
        context.addIssue({ code: 'custom', path: ['api_path'], message: 'API path is required.' });
      }
      if (!value.microservice) {
        context.addIssue({ code: 'custom', path: ['microservice'], message: 'Microservice is required.' });
      }
    }

    if (value.resource_type === RESOURCE_TYPES.menu && value.sequence_no === undefined) {
      context.addIssue({ code: 'custom', path: ['sequence_no'], message: 'Menu sequence is required.' });
    }
  });

export type ResourceFormValues = z.infer<typeof resourceSchema>;
