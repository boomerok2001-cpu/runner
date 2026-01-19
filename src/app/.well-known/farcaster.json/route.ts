function withValidProperties(properties: Record<string, undefined | string | string[]>) {
    return Object.fromEntries(
        Object.entries(properties).filter(([_, value]) => (Array.isArray(value) ? value.length > 0 : !!value))
    );
}

export async function GET() {
    const URL = process.env.NEXT_PUBLIC_URL || "https://run-from-justice.vercel.app";

    return Response.json({
        accountAssociation: {
            // These will be filled in after deploying and using Base Build tool
            header: "",
            payload: "",
            signature: ""
        },
        miniapp: withValidProperties({
            version: "1",
            name: "Run From Justice",
            homeUrl: URL,
            iconUrl: `${URL}/icon.png`,
            splashImageUrl: `${URL}/splash.png`,
            splashBackgroundColor: "#0d0d0d",
            webhookUrl: `${URL}/api/webhook`,
            subtitle: "Escape the long arm of the law!",
            description: "An exciting endless runner game where you dodge obstacles and collect coins while evading justice. How far can you run?",
            screenshotUrls: [
                `${URL}/screenshot1.png`,
                `${URL}/screenshot2.png`
            ],
            primaryCategory: "games",
            tags: ["game", "runner", "endless", "arcade"],
            heroImageUrl: `${URL}/splash.png`,
            tagline: "Can you outrun justice?",
            ogTitle: "Run From Justice",
            ogDescription: "An endless runner game - dodge obstacles, collect coins, evade justice!",
            ogImageUrl: `${URL}/splash.png`
        })
    });
}
