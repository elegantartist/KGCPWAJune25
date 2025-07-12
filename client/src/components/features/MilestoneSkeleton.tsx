import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const BadgeSkeleton = () => (
  <div className="flex flex-col items-center text-center gap-2">
    <Skeleton className="h-20 w-20 rounded-full" />
    <Skeleton className="h-4 w-16" />
  </div>
);

const ProgressCardSkeleton = () => (
  <Card className="border-border/50">
    <CardContent className="p-4">
      <div className="flex items-start">
        <Skeleton className="w-16 h-16 rounded-full mr-4 flex-shrink-0" />
        <div className="flex-1 space-y-2 mt-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="mt-3 space-y-2 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const MilestoneSkeleton = () => (
  <div className="space-y-6">
    {/* Skeleton for Achievement Badges */}
    <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 py-4">
          {Array.from({ length: 6 }).map((_, i) => <BadgeSkeleton key={i} />)}
        </div>
      </CardContent>
    </Card>

    {/* Skeleton for Badge Progress */}
    <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
      <CardHeader>
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ProgressCardSkeleton />
        </div>
      </CardContent>
    </Card>
  </div>
);