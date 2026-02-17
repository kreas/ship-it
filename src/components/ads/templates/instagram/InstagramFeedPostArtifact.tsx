"use client";

import dayjs from "dayjs"
import { useArtifact } from "@/components/ads/hooks/useArtifact"
import { InstagramFeedPost } from "./InstagramFeedPost"
import { DataPoint } from "@/components/data-point"

export const InstagramFeedPostArtifact = () => {
    const { content } = useArtifact()
    return <InstagramFeedPost content={content} />
}

export const InstagramFeedPostArtifactData = () => {
    const { artifact } = useArtifact()
    return <div className="space-y-4">
        <DataPoint label="Created on" value={dayjs(artifact.created_at).format('MMM D, YYYY [at] h:mm A')} />
        <DataPoint label="Caption" value={artifact.content.caption} copyable />
        <DataPoint label="CTA" value={artifact.content.cta.text} />
    </div>
}
