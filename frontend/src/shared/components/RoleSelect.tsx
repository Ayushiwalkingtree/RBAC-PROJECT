import {
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { Role } from '@/shared/types/rbac.types';

type RoleSelectProps = {
  label?: string;
  roles: Role[];
  value: string[];
  onChange: (roleIds: string[]) => void;
};

export const RoleSelect = ({ label = 'Roles', roles, value, onChange }: RoleSelectProps) => {
  const selectedNames = roles
    .filter((role) => value.includes(role.id))
    .map((role) => role.name)
    .join(', ');

  return (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select<string[]>
        multiple
        label={label}
        value={value}
        renderValue={() => selectedNames}
        onChange={(event: SelectChangeEvent<typeof value>) => {
          const nextValue = event.target.value;
          onChange(typeof nextValue === 'string' ? nextValue.split(',') : nextValue);
        }}
      >
        {roles.map((role) => (
          <MenuItem key={role.id} value={role.id}>
            <Checkbox checked={value.includes(role.id)} />
            <ListItemText primary={role.name} secondary={role.code} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
