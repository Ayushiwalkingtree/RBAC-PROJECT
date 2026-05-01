import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import KeyIcon from '@mui/icons-material/Key';
import SettingsIcon from '@mui/icons-material/Settings';
import type { SvgIconComponent } from '@mui/icons-material';

const ICONS: Record<string, SvgIconComponent> = {
  dashboard: DashboardIcon,
  users: GroupIcon,
  roles: AdminPanelSettingsIcon,
  permissions: KeyIcon,
  tickets: ConfirmationNumberIcon,
  reports: AssessmentIcon,
  settings: SettingsIcon,
};

type NavigationIconProps = {
  name: string;
};

export const NavigationIcon = ({ name }: NavigationIconProps) => {
  const Icon = ICONS[name] ?? DashboardIcon;
  return <Icon fontSize="small" />;
};
