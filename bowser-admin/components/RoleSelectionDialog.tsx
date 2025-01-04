import React, { useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'
import { Checkbox } from './ui/checkbox';
import { User, Role, MainUser } from '@/types';
import { Button } from './ui/button';
import { Label } from './ui/label';

interface RoleSelectionDialogProps {
    user: MainUser;
    roles: Role[];
    onUpdateRoles: (phoneNumber: string, roles: string[]) => void;
}

const RoleSelectionDialog: React.FC<RoleSelectionDialogProps> = ({ user, roles, onUpdateRoles }) => {
    const [open, setOpen] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<string[]>(user?.roles?.map((role) => String(role._id)));

    const handleToggleRole = (roleId: string) => {
        setSelectedRoles((prev) =>
            prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
        );
    };

    const handleUpdate = async () => {
        await onUpdateRoles(user.phoneNumber, selectedRoles);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                <Button variant="default">Manage Roles</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Manage Roles</DialogTitle>
                <DialogDescription>
                    Select the roles to assign to <strong>{user.name}</strong>.
                </DialogDescription>
                <div className="space-y-4">
                    {roles.map((role, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <Checkbox
                                id={`${role._id}`}
                                checked={selectedRoles.includes(String(role._id))}
                                onCheckedChange={() => handleToggleRole(String(role._id))}
                            />
                            <Label htmlFor={`${role._id}`}>{role.name}</Label>
                        </div>
                    ))}
                </div>
                <div className="flex space-x-2 mt-4">
                    <Button className="btn" onClick={handleUpdate}>
                        Update
                    </Button>
                    <DialogTrigger>
                        <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                    </DialogTrigger>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default RoleSelectionDialog;
