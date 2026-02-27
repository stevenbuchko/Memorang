export interface MockUser {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface MockMessage {
  id: string;
  user: MockUser;
  content: string;
  timestamp: string;
  mockAttachment?: {
    filename: string;
    sizeLabel: string;
  };
}

const yermie: MockUser = { id: "user-1", name: "Dr. Yermie Cohen", initials: "YC", color: "bg-emerald-600" };
const kirin: MockUser = { id: "user-2", name: "Kirin Quackenbush", initials: "KQ", color: "bg-blue-600" };
const chris: MockUser = { id: "user-3", name: "Chris Farina", initials: "CF", color: "bg-violet-600" };
const vivek: MockUser = { id: "user-4", name: "Vivek Kumar", initials: "VK", color: "bg-amber-600" };
const jefree: MockUser = { id: "user-5", name: "Jefree Sujit", initials: "JS", color: "bg-rose-600" };
const aayush: MockUser = { id: "user-6", name: "Aayush Sahgal", initials: "AS", color: "bg-cyan-600" };
const lings: MockUser = { id: "user-7", name: "Lings Palanichamy", initials: "LP", color: "bg-teal-600" };
const ashutosh: MockUser = { id: "user-8", name: "Ashutosh Dwivedi", initials: "AD", color: "bg-orange-600" };
const dewansh: MockUser = { id: "user-9", name: "Dewansh Thakur", initials: "DT", color: "bg-pink-600" };

export const MOCK_USERS = [yermie, kirin, chris, vivek, jefree, aayush, lings, ashutosh, dewansh];

export const AI_USER: MockUser = {
  id: "ai",
  name: "Memorang AI",
  initials: "AI",
  color: "bg-indigo-600",
};

export const MOCK_MESSAGES: MockMessage[] = [
  {
    id: "mock-1",
    user: yermie,
    content: "Hey team, I've been pulling together the curriculum outline for the new IT Professional certification track. Here's the draft framework covering the core competency areas.",
    timestamp: "2024-12-15T14:30:00Z",
  },
  {
    id: "mock-2",
    user: yermie,
    content: "",
    timestamp: "2024-12-15T14:31:00Z",
    mockAttachment: {
      filename: "IT-Professional-Curriculum-Framework-v2.pdf",
      sizeLabel: "3.1 MB",
    },
  },
  {
    id: "mock-3",
    user: chris,
    content: "Nice work Yermie. Does this include the cloud infrastructure module? We got feedback from the advisory board that AWS and Azure fundamentals need more depth.",
    timestamp: "2024-12-15T14:45:00Z",
  },
  {
    id: "mock-4",
    user: yermie,
    content: "Yes, Module 4 covers cloud infrastructure in detail — AWS, Azure, and GCP fundamentals plus hands-on labs. I bumped it from 3 weeks to 5 weeks based on that feedback.",
    timestamp: "2024-12-15T14:52:00Z",
  },
  {
    id: "mock-5",
    user: lings,
    content: "I have the CompTIA alignment matrix from our accreditation review. Uploading so we can cross-reference against the curriculum modules.",
    timestamp: "2024-12-15T15:10:00Z",
  },
  {
    id: "mock-6",
    user: lings,
    content: "",
    timestamp: "2024-12-15T15:11:00Z",
    mockAttachment: {
      filename: "CompTIA-Alignment-Matrix-2025.pdf",
      sizeLabel: "1.2 MB",
    },
  },
  {
    id: "mock-7",
    user: kirin,
    content: "Can someone review the alignment matrix before our accreditation call on Monday? We need to make sure every learning objective maps to at least one CompTIA domain.",
    timestamp: "2024-12-15T15:30:00Z",
  },
  {
    id: "mock-8",
    user: vivek,
    content: "I'll go through it this weekend. I'll also cross-check against the cybersecurity module — that's the one area where I think we might have gaps.",
    timestamp: "2024-12-15T15:45:00Z",
  },
];
