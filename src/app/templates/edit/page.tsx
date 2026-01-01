"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getTemplate, updateTemplate, Template } from "@/lib/db";
import TemplateForm from "../form";

function EditTemplateContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const router = useRouter();
    const [template, setTemplate] = useState<Template | null>(null);

    useEffect(() => {
        if (id) {
            getTemplate(id).then((t) => {
                if (t) setTemplate(t);
                else router.push("/templates");
            });
        }
    }, [id, router]);

    const handleSubmit = async (data: any) => {
        if (id) {
            await updateTemplate(id, data);
        }
    };

    if (!template) return <div className="text-white text-center p-10">Loading...</div>;

    return <TemplateForm initialData={template} onSubmit={handleSubmit} title="Edit Routine" />;
}

export default function EditTemplatePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EditTemplateContent />
        </Suspense>
    );
}
