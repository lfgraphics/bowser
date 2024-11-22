import React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'

interface UsersCardProps {
    header: string;
    description: string;
    content: React.ReactNode;
    footer: React.ReactNode;
}

const UsersCard: React.FC<UsersCardProps> = ({ header, description, content, footer }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{header}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>{content}</CardContent>
            <CardFooter>{footer}</CardFooter>
        </Card>
    );
};

export default UsersCard;