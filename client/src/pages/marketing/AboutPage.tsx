import { useTranslation } from "react-i18next";
import { getSiteContent } from "../../content/marketing/siteContent";
import { MarketingTextPage } from "./MarketingTextPage";

export function AboutPage() {
  const { i18n } = useTranslation();
  const { about } = getSiteContent(i18n.language);
  return (
    <MarketingTextPage
      title={about.title}
      canonicalPath="/about"
      sections={about.sections}
    />
  );
}
