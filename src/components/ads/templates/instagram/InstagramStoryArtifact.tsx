"use client";

import React from "react"
import { useArtifact } from "@/components/ads/hooks/useArtifact"
import { InstagramStory } from "./InstagramStory"
import { DataPoint } from "@/components/data-point"
import dayjs from "dayjs"

export const InstagramStoryArtifact = () => {
    const { content } = useArtifact()
    return <InstagramStory content={content} />
}

export const InstagramStoryArtifactData = () => {
    const { artifact } = useArtifact()

    return <div className="space-y-4">
        <DataPoint label="Created on" value={dayjs(artifact.created_at).format('MMM D, YYYY [at] h:mm A')} />
        <DataPoint label="CTA" value={artifact.content.cta.text} />
    </div>
}
