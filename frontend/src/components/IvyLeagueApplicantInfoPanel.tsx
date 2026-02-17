'use client';

interface InfoPanelProps {
  pointerNo: number;
}

const infoContent = {
  1: {
    subtitle: "Ivy Leagues want intellectual curiosity, not just report cards",
    sections: [
      {
        heading: "Must-have:",
        items: [
          "Top 5-10% class ranking or equivalent (90%+ in CBSE/ICSE/IB)",
          "High SAT/ACT scores (typically 1450+ SAT or 52+ ACT)",
          "Strong AP/IB/Advanced coursework (if available)",
          "National or international academic achievements (e.g., Olympiads, NTSE, ICSE/ISC/CBSE toppers)"
        ]
      },
      {
        heading: "Pro Tip:",
        text: "Deep engagement with learning outside the classroom - research, MOOCs, passion projects - counts more than just marks."
      }
    ]
  },
  2: {
    subtitle: "Ivy schools prefer students who go deep and wide in one compelling area.",
    sections: [
      {
        heading: "Examples:",
        items: [
          "Published author at age 17",
          "Founded a startup or NGO with measurable impact",
          "Conducted original research (even pre-college)",
          "Olympiad medalist or national-level athlete",
          "Built an AI tool solving a real-world problem",
          "Created a viral app or social media campaign with civic impact"
        ]
      },
      {
        heading: "Message:",
        text: "They want \"outliers\" - not just checklist-followers."
      }
    ]
  },
  3: {
    subtitle: "IVY LEAGUES LOVE SELF-STARTERS, CHANGEMAKERS, AND BOLD THINKERS.",
    sections: [
      {
        heading: "Must-show:",
        items: [
          "Founded or led a club, initiative, campaign, or business",
          "Took leadership in crisis (e.g., COVID volunteer, education access)",
          "Started a podcast, YouTube channel, or publication",
          "Mentored juniors or built community initiatives"
        ]
      },
      {
        heading: "Important:",
        text: "Leadership isn't always titles—it's impact and ownership."
      }
    ]
  },
  4: {
    subtitle: "IVY LEAGUES SEEK STUDENTS WHO THINK BEYOND THEMSELVES.",
    sections: [
      {
        heading: "Examples:",
        items: [
          "Started a rural education initiative",
          "Built a platform connecting underprivileged students to tutors",
          "Published policy research or attended UN youth summits",
          "Developed tech for sustainability or public health",
          "Awareness campaigns on gender, mental health, climate, etc."
        ]
      },
      {
        heading: "Message:",
        text: "They want future global leaders, activists, entrepreneurs, and scientists."
      }
    ]
  },
  5: {
    subtitle: "THE PERSONAL ESSAY IS YOUR SOUL ON PAPER.",
    sections: [
      {
        heading: "What they seek:",
        items: [
          "Honesty over perfection",
          "Unique life experiences or identity",
          "Personal challenges and growth",
          "Deep self-awareness and purpose",
          "Passion that feels lived—not just claimed"
        ]
      },
      {
        heading: "Message:",
        text: "A well-written, introspective, emotionally intelligent essay can outweigh small gaps in scores."
      }
    ]
  },
  6: {
    subtitle: "THEY LOVE STUDENTS WHO LOVE LEARNING FOR LEARNING'S SAKE.",
    sections: [
      {
        heading: "How to show it:",
        items: [
          "Started a blog or research journal",
          "Pursued university-level coursework via Coursera, EdX, etc.",
          "Connected academic interest with real-world application (e.g., Econ student analyzing inflation at local market)",
          "Initiated at local market"
        ]
      },
      {
        heading: "Message:",
        text: "Ivy Leagues are academic havens—they want students who nerd out, passionately."
      }
    ]
  }
};

export default function IvyLeagueApplicantInfoPanel({ pointerNo }: InfoPanelProps) {
  const content = infoContent[pointerNo as keyof typeof infoContent];

  if (!content) return null;

  return (
    <div className="mb-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border-2 border-blue-200 shadow-lg">
      {/* Header */}
      <div className="mb-6">
        {content.subtitle && (
          <p className="text-lg font-bold text-gray-700">{content.subtitle}</p>
        )}
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {content.sections.map((section, idx) => (
          <div key={idx} className="bg-white rounded-lg p-6 border border-blue-100">
            {section.heading && (
              <h3 className="text-lg font-bold text-gray-900 mb-3">{section.heading}</h3>
            )}

            {section.items && section.items.length > 0 && (
              <ul className="space-y-2 ml-4">
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex gap-3 text-gray-700">
                    <span className="text-blue-600 font-black flex-shrink-0">•</span>
                    <span className="text-base leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {section.text && (
              <p className="text-gray-700 italic font-medium">{section.text}</p>
            )}
          </div>
        ))}
      </div>

      {/* Decorative divider */}
      <div className="flex justify-center gap-2 mt-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-blue-400"></div>
        ))}
      </div>
    </div>
  );
}
