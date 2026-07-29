import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { ProfileActions } from "@/components/public/ProfileActions";
import { Avatar } from "@/components/Avatar";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { publicProfileDto } from "@/lib/api/mappers";
import { getSessionUser } from "@/lib/auth/session";

type PageProps = { params: { id: string } };

async function fetchProfile(id: string) {
  const data = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!data[0] || data[0].isBanned) return null;
  return publicProfileDto({
    id: data[0].id,
    full_name: data[0].fullName,
    email: data[0].email,
    industry: data[0].industry,
    career_stage: data[0].careerStage,
    city: data[0].city,
    country: data[0].country,
    bio: data[0].bio,
    skills: data[0].skills ?? [],
    plan: data[0].plan,
    show_photo: data[0].showPhoto,
    open_to_opportunities: data[0].openToOpportunities,
    avatar_url: data[0].avatarUrl,
    created_at: data[0].createdAt?.toISOString() ?? null,
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const profile = await fetchProfile(params.id);
  if (!profile) return { title: "Profile not found" };
  const title = `${profile.full_name} — ${profile.industry} on Ummah Connect`;
  const description = profile.bio || `${profile.full_name} on Ummah Connect`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const [profile, user] = await Promise.all([
    fetchProfile(params.id),
    getSessionUser(),
  ]);
  if (!profile) notFound();

  const showAvatar = profile.show_photo !== false;

  return (
    <PublicLayout user={user}>
      <main className="page">
        <div className="container">
          <Link href="/" className="brand public-brand">
            Ummah <span>Connect</span>
          </Link>
          <article className="card public-card">
            <div className="public-profile-header">
              {showAvatar ? (
                <div style={{ flexShrink: 0, position: 'relative' }}>
                  <Avatar name={profile.full_name} size={72} src={profile.avatar_url} />
                </div>
              ) : null}
              <div>
                <h1 className="font-display public-profile-name">{profile.full_name}</h1>
                <p className="muted public-copy">
                  {[profile.career_stage, profile.industry, [profile.city, profile.country].filter(Boolean).join(", ")]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            {profile.open_to_opportunities ? (
              <span className="pill pill--active" style={{ marginTop: 14, display: "inline-flex" }}>
                Open to opportunities
              </span>
            ) : null}
            {profile.bio ? <p className="public-text">{profile.bio}</p> : null}
            {profile.skills.length > 0 ? (
              <div className="row row--wrap public-skill-row">
                {profile.skills.map((skill: string) => (
                  <span className="pill" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
            {user?.id !== profile.id ? (
              <ProfileActions user={user} profileId={profile.id} />
            ) : null}
          </article>
        </div>
      </main>
    </PublicLayout>
  );
}
