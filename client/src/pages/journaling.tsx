import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Save, BookOpen, CalendarDays } from "lucide-react";
import { createHapticFeedback } from "@/lib/soundEffects";

interface JournalEntry {
  id: number;
  date: Date;
  content: string;
}

const Journaling: React.FC = () => {
  const isMobile = useIsMobile();
  const [date, setDate] = useState<Date>(new Date());
  const [currentEntry, setCurrentEntry] = useState<string>("");
  const [entries, setEntries] = useState<JournalEntry[]>([
    {
      id: 1,
      date: new Date(Date.now() - 86400000 * 2), // 2 days ago
      content: "Started my new diet plan today. Feel motivated to stick with it."
    },
    {
      id: 2,
      date: new Date(Date.now() - 86400000), // 1 day ago
      content: "Exercise was difficult today but I pushed through it. Proud of myself for not giving up."
    }
  ]);
  const [activeTab, setActiveTab] = useState<string>("write");

  const saveEntry = () => {
    if (currentEntry.trim() === "") return;
    
    createHapticFeedback();

    const newEntry: JournalEntry = {
      id: Date.now(),
      date: date,
      content: currentEntry
    };

    setEntries([...entries, newEntry]);
    setCurrentEntry("");
  };

  const selectedDateEntries = entries.filter(
    entry => format(entry.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
  );

  return (
    <div className="space-y-6">
      <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
        <CardHeader>
          <CardTitle className="text-[#676767] flex items-center">
            <BookOpen className="w-6 h-6 text-[#2E8BC0] mr-2" />
            <span>Journaling</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="write" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="write" className="text-[#676767]">Write Entry</TabsTrigger>
              <TabsTrigger value="history" className="text-[#676767]">View History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="write" className="space-y-4">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5 text-[#2E8BC0]" />
                  <span className="text-[#676767] font-medium">
                    {format(date, "MMMM d, yyyy")}
                  </span>
                </div>
                
                <Textarea
                  value={currentEntry}
                  onChange={(e) => setCurrentEntry(e.target.value)}
                  placeholder="Write your thoughts, feelings, and reflections here..."
                  className="min-h-[200px] border-[#2E8BC0]/20 text-[#676767]"
                />
                
                <Button 
                  onClick={saveEntry}
                  className="bg-[#2E8BC0] hover:bg-[#267cad] text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Entry
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-2 text-[#676767]">Select Date</h3>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    className="rounded-md border border-[#2E8BC0]/20"
                  />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2 text-[#676767]">
                    Entries for {format(date, "MMMM d, yyyy")}
                  </h3>
                  
                  {selectedDateEntries.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDateEntries.map((entry) => (
                        <Card key={entry.id} className="border-[#2E8BC0]/20">
                          <CardContent className="p-4">
                            <p className="text-[#676767]">{entry.content}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#a4a4a4] italic">No entries for this date.</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Journaling;