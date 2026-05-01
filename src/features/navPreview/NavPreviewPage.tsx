import { Box, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PermissionChip } from '@/shared/components/PermissionChip';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { navPreviewService, type UserNavigationPreview } from '@/features/navPreview/navPreview.service';
import type { UserRecord } from '@/shared/types/auth.types';

export const NavPreviewPage = () => {
  const session = useAuthStore((state) => state.session);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [preview, setPreview] = useState<UserNavigationPreview | null>(null);

  useEffect(() => {
    if (!session) return;

    void navPreviewService.listUsers(session.org.id).then((nextUsers) => {
      setUsers(nextUsers);
      const firstUserId = nextUsers[0]?.id ?? '';
      setSelectedUserId(firstUserId);
      if (firstUserId) {
        void navPreviewService.getPreview(firstUserId).then(setPreview);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.org.id]);

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    void navPreviewService.getPreview(userId).then(setPreview);
  };

  return (
    <>
      <PageHeader title="Nav Preview" subtitle="Verify a user's menu tree and API access from effective permissions." />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' }, gap: 2 }}>
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
          <TextField select label="User" value={selectedUserId} onChange={(event) => handleUserChange(event.target.value)} fullWidth>
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name} · {user.email}
              </MenuItem>
            ))}
          </TextField>
        </Paper>
        <Stack spacing={2}>
          {!preview ? (
            <EmptyState title="No preview" description="Select a user to calculate navigation." />
          ) : (
            <>
              <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
                <Typography variant="h6">Menu tree</Typography>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {preview.navigation.map((item) => (
                    <Box key={item.id}>
                      <Typography variant="body2" fontWeight={900}>{item.label}</Typography>
                      {item.children?.map((child) => (
                        <Typography key={child.id} variant="caption" color="text.secondary" display="block" sx={{ pl: 2 }}>
                          {child.label}
                        </Typography>
                      ))}
                    </Box>
                  ))}
                </Stack>
              </Paper>
              <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
                <Typography variant="h6">API access</Typography>
                <Stack spacing={1.25} sx={{ mt: 2 }}>
                  {preview.apiResources.map((resource) => (
                    <Stack key={resource.id} direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                      <Typography variant="body2" fontWeight={900}>{resource.resourceKey}</Typography>
                      {(preview.permissions[resource.resourceKey] ?? []).map((permission) => (
                        <PermissionChip key={`${resource.resourceKey}-${permission}`} label={permission} selected />
                      ))}
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </>
          )}
        </Stack>
      </Box>
    </>
  );
};
