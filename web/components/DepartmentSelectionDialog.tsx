import React, { useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'
import { Checkbox } from './ui/checkbox';
import { MainUser, Department } from '@/types';
import { Button } from './ui/button';
import { Label } from './ui/label';

interface RoleSelectionDialogProps {
    user: MainUser;
    departments: Department[];
    onUpdateRoles: (phoneNumber: string, department: string) => void;
}

const RoleSelectionDialog: React.FC<RoleSelectionDialogProps> = ({ user, departments, onUpdateRoles }) => {
    const [open, setOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<string>(user?.department && String(user.department._id));

    const handleToggleDepartment = (departmentId: string) => {
        setSelectedDepartment(departmentId);
    };

    const handleUpdate = async () => {
        await onUpdateRoles(user.phoneNumber, selectedDepartment);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                <Button variant="default">Manage Department</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Manage Department</DialogTitle>
                <DialogDescription>
                    Select the department to assign to <strong>{user.name}</strong>.
                </DialogDescription>
                <div className="space-y-4">
                    {departments.map((department, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <Checkbox
                                id={`${department._id}`}
                                checked={selectedDepartment?.includes(String(department._id))}
                                onCheckedChange={() => handleToggleDepartment(String(department._id))}
                            />
                            <Label htmlFor={`${department._id}`}>{department.name}</Label>
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
