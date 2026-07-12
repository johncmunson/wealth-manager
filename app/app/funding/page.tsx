import { FundingOverview } from "@/components/funding/funding-overview"
import { getFundingSnapshot } from "@/lib/alpaca/funding"

export default async function Page() {
  return <FundingOverview snapshot={await getFundingSnapshot()} />
}
