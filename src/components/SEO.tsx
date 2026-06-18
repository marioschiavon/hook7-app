import { Helmet } from 'react-helmet-async';

interface SEOProps {
  browserTitle?: string;
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: string;
}

export const SEO = ({ 
  browserTitle,
  title, 
  description, 
  canonical, 
  noindex = false,
  ogImage = "https://kfsvpbujmetlendgwnrs.supabase.co/storage/v1/object/public/assets/favicon.svg",
  ogType = "website"
}: SEOProps) => {
  const seoTitle = title.includes("Hook7") ? title : `${title} | Hook7`;
  const tabTitle = browserTitle || "Hook7";
  
  return (
    <Helmet>
      <title>{tabTitle}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      
      {/* Open Graph */}
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      {canonical && <meta property="og:url" content={canonical} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;
