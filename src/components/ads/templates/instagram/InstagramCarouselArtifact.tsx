"use client";

import React from "react";
import { useArtifact } from "@/components/ads/hooks/useArtifact";
import { InstagramCarousel } from "./InstagramCarousel";
import { DataPoint } from "@/components/data-point";
import dayjs from "dayjs";

export const InstagramCarouselArtifact = () => {
    const { content, id } = useArtifact()
    return <InstagramCarousel content={content} enableGenerate={false} artifactId={id!} />
}

export const InstagramCarouselArtifactData = () => {
    const { artifact } = useArtifact()

    return (
        <div className="space-y-4">
            <DataPoint label="Created on" value={dayjs(artifact.created_at).format('MMM D, YYYY [at] h:mm A')} />
            <DataPoint label="Caption" value={artifact.content.caption} copyable />
            <DataPoint label="CTA" value={artifact.content.cta.text} />
        </div>
    )
}
