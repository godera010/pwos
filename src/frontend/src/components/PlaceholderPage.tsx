import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface PlaceholderPageProps {
    title: string;
    description: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight">{title}</h1>
                <p className="text-slate-500 text-sm font-medium">{description}</p>
            </div>

            <Card className="border-none shadow-sm dark:bg-slate-900/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="size-5 text-indigo-500" />
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Feature in Development</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="size-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                        <div className="size-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Module is being optimized</h2>
                    <p className="text-slate-500 max-w-sm">
                        We are currently synchronizing the ML engine and Figma assets for this section. Full data visibility will be restored in V2.1.
                    </p>
                    <Badge variant="outline" className="mt-8 border-indigo-500/20 text-indigo-500 font-bold">
                        PHASE: UI SYNCING
                    </Badge>
                </CardContent>
            </Card>
        </div>
    );
};
