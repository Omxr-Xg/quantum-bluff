import { useTranslation } from "react-i18next";
import { getSiteContent } from "../../content/marketing/siteContent";
import { MarketingTextPage } from "./MarketingTextPage";

export function ResponsibleGamingPage() {
  const { i18n, t } = useTranslation();
  const content = getSiteContent(i18n.language).responsibleGaming!;
  return (
    <MarketingTextPage
      title={content.title}
      canonicalPath="/responsible-gaming"
      lastUpdated={`${t("publicSite.lastUpdated")} ${content.lastUpdated}`}
      sections={content.sections}
    />
  );
}
