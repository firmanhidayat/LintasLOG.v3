"use client";

// import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadDictionaries,
  t,
  getLang,
  onLangChange,
  type Lang,
} from "@/lib/i18n";

type TabKey = "terms" | "privacy";
type TocItem = { id: string; label: string };
type SectionGroup = { title: string; items: TocItem[] };

const APP_NAME = "LintasLOG";
const LAST_UPDATED_ISO = "2025-10-01";

function SectionHeader({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-xl font-semibold mt-10 mb-3 text-gray-900"
    >
      {children}
    </h2>
  );
}
function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 leading-relaxed text-gray-800">{children}</p>;
}
function Bullet({ children }: { children: React.ReactNode }) {
  return <li className="mb-2">{children}</li>;
}
function Divider() {
  return <hr className="my-10 border-gray-200" />;
}

export default function TermsPrivacyPage() {
  const [i18nReady, setI18nReady] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>(getLang());
  const [tab, setTab] = useState<TabKey>("terms");

  useEffect(() => {
    const off = onLangChange((lang) => setActiveLang(lang));
    return () => off?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setI18nReady(false);
    (async () => {
      try {
        await loadDictionaries();
        if (!cancelled) setI18nReady(true);
      } catch (err) {
        console.error("[i18n] loadDictionaries failed:", err);
        if (!cancelled) setI18nReady(true); // tetap render konten default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!i18nReady) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 h-7 w-64 rounded bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <div className="hidden lg:block">
            <div className="h-80 rounded bg-gray-100 animate-pulse" />
          </div>
          <div>
            <div className="h-6 w-1/2 rounded bg-gray-200 animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-gray-200 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const lastUpdated = new Date(LAST_UPDATED_ISO).toLocaleDateString(
    activeLang === "id" ? "id-ID" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const termsToc: SectionGroup[] = [
    {
      title: t("terms.toc.section.about"),
      items: [
        { id: "t-intro", label: t("terms.toc.intro") },
        { id: "t-defs", label: t("terms.toc.defs") },
      ],
    },
    {
      title: t("terms.toc.section.use"),
      items: [
        { id: "t-usage", label: t("terms.toc.usage") },
        { id: "t-account", label: t("terms.toc.account") },
        { id: "t-usercontent", label: t("terms.toc.usercontent") },
        { id: "t-prohibited", label: t("terms.toc.prohibited") },
      ],
    },
    {
      title: t("terms.toc.section.legal"),
      items: [
        { id: "t-ip", label: t("terms.toc.ip") },
        { id: "t-fees", label: t("terms.toc.fees") },
        { id: "t-liability", label: t("terms.toc.liability") },
        { id: "t-law", label: t("terms.toc.law") },
        { id: "t-changes", label: t("terms.toc.changes") },
        { id: "t-contact", label: t("terms.toc.contact") },
      ],
    },
  ];

  const privacyToc: SectionGroup[] = [
    {
      title: t("privacy.toc.section.about"),
      items: [
        { id: "p-intro", label: t("privacy.toc.intro") },
        { id: "p-legalbasis", label: t("privacy.toc.legalbasis") },
        { id: "p-collect", label: t("privacy.toc.collect") },
      ],
    },
    {
      title: t("privacy.toc.section.process"),
      items: [
        { id: "p-use", label: t("privacy.toc.use") },
        { id: "p-retention", label: t("privacy.toc.retention") },
        { id: "p-sharing", label: t("privacy.toc.sharing") },
        { id: "p-transfer", label: t("privacy.toc.transfer") },
      ],
    },
    {
      title: t("privacy.toc.section.safeguard"),
      items: [
        { id: "p-security", label: t("privacy.toc.security") },
        { id: "p-cookies", label: t("privacy.toc.cookies") },
        { id: "p-rights", label: t("privacy.toc.rights") },
        { id: "p-children", label: t("privacy.toc.children") },
        { id: "p-changes", label: t("privacy.toc.changes") },
        { id: "p-contact", label: t("privacy.toc.contact") },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-gray-800">
      {/* Header + Tabs */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">
          {tab === "terms" ? t("terms.title") : t("privacy.title")}
        </h1>
        <p className="text-sm text-gray-500">
          {t("common.lastUpdated")} {lastUpdated}
        </p>

        <div className="mt-6 inline-flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab("terms")}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
              tab === "terms"
                ? "bg-primary text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            aria-pressed={tab === "terms"}
          >
            {t("tabs.terms")}
          </button>
          <button
            type="button"
            onClick={() => setTab("privacy")}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
              tab === "privacy"
                ? "bg-primary text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            aria-pressed={tab === "privacy"}
          >
            {t("tabs.privacy")}
          </button>
        </div>
      </header>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block">
          <nav aria-label="Table of contents" className="sticky top-24">
            {(tab === "terms" ? termsToc : privacyToc).map((group) => (
              <div key={group.title} className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  {group.title}
                </h3>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <a
                        className="text-sm text-gray-700 hover:text-primary hover:underline"
                        href={`#${item.id}`}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <article className="prose prose-gray max-w-none">
          {tab === "terms" ? (
            <>
              <SectionHeader id="t-intro">{t("terms.h.intro")}</SectionHeader>
              <Paragraph>{t("terms.p.intro", { app: APP_NAME })}</Paragraph>

              <SectionHeader id="t-defs">{t("terms.h.defs")}</SectionHeader>
              <ul className="list-disc ml-6">
                <Bullet>
                  <strong>{t("terms.def.user.h")}</strong> —{" "}
                  {t("terms.def.user.p", { app: APP_NAME })}
                </Bullet>
                <Bullet>
                  <strong>{t("terms.def.shipper.h")}</strong> —{" "}
                  {t("terms.def.shipper.p")}
                </Bullet>
                <Bullet>
                  <strong>{t("terms.def.transporter.h")}</strong> —{" "}
                  {t("terms.def.transporter.p")}
                </Bullet>
                <Bullet>
                  <strong>{t("terms.def.platform.h")}</strong> —{" "}
                  {t("terms.def.platform.p", { app: APP_NAME })}
                </Bullet>
              </ul>

              <SectionHeader id="t-usage">{t("terms.h.usage")}</SectionHeader>
              <Paragraph>{t("terms.p.usage1")}</Paragraph>
              <ul className="list-disc ml-6">
                <Bullet>{t("terms.usage.i1")}</Bullet>
                <Bullet>{t("terms.usage.i2")}</Bullet>
                <Bullet>{t("terms.usage.i3")}</Bullet>
              </ul>

              <SectionHeader id="t-account">
                {t("terms.h.account")}
              </SectionHeader>
              <Paragraph>{t("terms.p.account1")}</Paragraph>
              <ul className="list-disc ml-6">
                <Bullet>{t("terms.account.i1")}</Bullet>
                <Bullet>{t("terms.account.i2")}</Bullet>
                <Bullet>{t("terms.account.i3")}</Bullet>
              </ul>

              <SectionHeader id="t-usercontent">
                {t("terms.h.usercontent")}
              </SectionHeader>
              <Paragraph>{t("terms.p.usercontent1")}</Paragraph>

              <SectionHeader id="t-prohibited">
                {t("terms.h.prohibited")}
              </SectionHeader>
              <ul className="list-disc ml-6">
                <Bullet>{t("terms.prohibited.i1")}</Bullet>
                <Bullet>{t("terms.prohibited.i2")}</Bullet>
                <Bullet>{t("terms.prohibited.i3")}</Bullet>
                <Bullet>{t("terms.prohibited.i4")}</Bullet>
              </ul>

              <SectionHeader id="t-ip">{t("terms.h.ip")}</SectionHeader>
              <Paragraph>{t("terms.p.ip1", { app: APP_NAME })}</Paragraph>

              <SectionHeader id="t-fees">{t("terms.h.fees")}</SectionHeader>
              <Paragraph>{t("terms.p.fees1")}</Paragraph>

              <SectionHeader id="t-liability">
                {t("terms.h.liability")}
              </SectionHeader>
              <Paragraph>
                {t("terms.p.liability1", { app: APP_NAME })}
              </Paragraph>

              <SectionHeader id="t-law">{t("terms.h.law")}</SectionHeader>
              <Paragraph>{t("terms.p.law1")}</Paragraph>

              <SectionHeader id="t-changes">
                {t("terms.h.changes")}
              </SectionHeader>
              <Paragraph>{t("terms.p.changes1")}</Paragraph>

              <SectionHeader id="t-contact">
                {t("terms.h.contact")}
              </SectionHeader>
              <Paragraph>
                {t("terms.p.contact1")}{" "}
                <a
                  href="mailto:support@lintaslog.com"
                  className="text-primary hover:underline"
                >
                  support@lintaslog.com
                </a>
                .
              </Paragraph>

              <Divider />
              <Paragraph>
                © {new Date().getFullYear()} {APP_NAME}.{" "}
                {t("common.rightsReserved")}
              </Paragraph>
            </>
          ) : (
            <>
              <SectionHeader id="p-intro">{t("privacy.h.intro")}</SectionHeader>
              <Paragraph>{t("privacy.p.intro", { app: APP_NAME })}</Paragraph>

              <SectionHeader id="p-legalbasis">
                {t("privacy.h.legalbasis")}
              </SectionHeader>
              <ul className="list-disc ml-6">
                <Bullet>{t("privacy.legalbasis.i1")}</Bullet>
                <Bullet>{t("privacy.legalbasis.i2")}</Bullet>
                <Bullet>{t("privacy.legalbasis.i3")}</Bullet>
              </ul>

              <SectionHeader id="p-collect">
                {t("privacy.h.collect")}
              </SectionHeader>
              <ul className="list-disc ml-6">
                <Bullet>{t("privacy.collect.i1")}</Bullet>
                <Bullet>{t("privacy.collect.i2")}</Bullet>
                <Bullet>{t("privacy.collect.i3")}</Bullet>
              </ul>

              <SectionHeader id="p-use">{t("privacy.h.use")}</SectionHeader>
              <ul className="list-disc ml-6">
                <Bullet>{t("privacy.use.i1")}</Bullet>
                <Bullet>{t("privacy.use.i2")}</Bullet>
                <Bullet>{t("privacy.use.i3")}</Bullet>
                <Bullet>{t("privacy.use.i4")}</Bullet>
              </ul>

              <SectionHeader id="p-retention">
                {t("privacy.h.retention")}
              </SectionHeader>
              <Paragraph>{t("privacy.p.retention1")}</Paragraph>

              <SectionHeader id="p-sharing">
                {t("privacy.h.sharing")}
              </SectionHeader>
              <Paragraph>{t("privacy.p.sharing1")}</Paragraph>

              <SectionHeader id="p-transfer">
                {t("privacy.h.transfer")}
              </SectionHeader>
              <Paragraph>{t("privacy.p.transfer1")}</Paragraph>

              <SectionHeader id="p-security">
                {t("privacy.h.security")}
              </SectionHeader>
              <Paragraph>{t("privacy.p.security1")}</Paragraph>

              <SectionHeader id="p-cookies">
                {t("privacy.h.cookies")}
              </SectionHeader>
              <Paragraph>{t("privacy.p.cookies1")}</Paragraph>

              <SectionHeader id="p-rights">
                {t("privacy.h.rights")}
              </SectionHeader>
              <ul className="list-disc ml-6">
                <Bullet>{t("privacy.rights.i1")}</Bullet>
                <Bullet>{t("privacy.rights.i2")}</Bullet>
                <Bullet>{t("privacy.rights.i3")}</Bullet>
                <Bullet>{t("privacy.rights.i4")}</Bullet>
              </ul>

              <SectionHeader id="p-children">
                {t("privacy.h.children")}
              </SectionHeader>
              <Paragraph>{t("privacy.p.children1")}</Paragraph>

              <SectionHeader id="p-changes">
                {t("privacy.h.changes")}
              </SectionHeader>
              <Paragraph>{t("privacy.p.changes1")}</Paragraph>

              <SectionHeader id="p-contact">
                {t("privacy.h.contact")}
              </SectionHeader>
              <Paragraph>
                {t("privacy.p.contact1")}{" "}
                <a
                  href="mailto:support@lintaslog.com"
                  className="text-primary hover:underline"
                >
                  support@lintaslog.com
                </a>
                .
              </Paragraph>

              <Divider />
              <Paragraph>
                © {new Date().getFullYear()} {APP_NAME}.{" "}
                {t("common.rightsReserved")}
              </Paragraph>

              <p className="text-sm text-gray-500 mt-4">
                {t("privacy.seeAlso")}{" "}
                <button
                  type="button"
                  onClick={() => setTab("terms")}
                  className="text-primary hover:underline"
                >
                  {t("privacy.seeAlsoLink")}
                </button>
                .
              </p>
            </>
          )}
        </article>
      </div>
    </main>
  );
}
