"use client";

import { createTemplate } from "@/lib/db";
import TemplateForm from "../form";

export default function NewTemplatePage() {
    const handleSubmit = async (data: any) => {
        await createTemplate(data);
    };

    return <TemplateForm onSubmit={handleSubmit} title="New Routine" />;
}
