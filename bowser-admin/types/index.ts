export interface Driver {
    Name: string;
    ITPLId: string | null;
    MobileNo?: Array<{
        MobileNo: string;
        IsDefaultNumber: boolean;
        LastUsed: boolean;
    }>;
}
export interface User {
    _id: string;
    userId: string;
    name: string;
}