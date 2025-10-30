"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Chamber, Level } from "@/types";
import Loading from "@/app/loading";
import { BASE_URL } from "@/lib/api";

export default function BowserFormPage() {
    const [bowserRegNo, setBowserRegNo] = useState("");
    const [chambers, setChambers] = useState<Chamber[]>([
        {
            chamberId: `Chamber-1`,
            levels: [
                {
                    levelNo: 1,
                    levelHeight: 0,
                    levelAdditionQty: 0,
                    levelTotalQty: 0,
                    levelCalibrationQty: 0,
                },
            ],
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const searchParams = useSearchParams();
    const id = searchParams.get("id"); // Get `id` from query parameters

    // Fetch existing bowser details if `id` is present
    useEffect(() => {
        if (id) {
            setIsLoading(true);
            fetch(`${BASE_URL}/bowsers/${id}`)
                .then((res) => res.json())
                .then((data) => {
                    setBowserRegNo(data.regNo);
                    setChambers(data.chambers);
                    console.log("data: ", data)
                })
                .catch((err) => console.error("Error fetching bowser data:", err))
                .finally(() => setIsLoading(false));
        }
    }, [id]);

    const handleAddChamber = () => {
        const newChamberId = `Chamber-${chambers.length + 1}`;
        setChambers([
            ...chambers,
            {
                chamberId: newChamberId,
                levels: [
                    {
                        levelNo: 1,
                        levelHeight: 0,
                        levelAdditionQty: 0,
                        levelTotalQty: 0,
                        levelCalibrationQty: 0,
                    },
                ],
            },
        ]);
    };

    const handleRemoveChamber = (index: number) => {
        const updatedChambers = [...chambers];
        updatedChambers.splice(index, 1);
        setChambers(updatedChambers);
    };

    const handleAddLevel = (chamberIndex: number) => {
        const updatedChambers = [...chambers];
        const levels = updatedChambers[chamberIndex].levels;
        const lastLevel = levels[levels.length - 1];

        levels.push({
            levelNo: lastLevel.levelNo + 1,
            levelHeight: 0,
            levelAdditionQty: 0,
            levelTotalQty: 0,
            levelCalibrationQty: 0,
        });

        setChambers(updatedChambers);
    };

    const handleRemoveLevel = (chamberIndex: number, levelIndex: number) => {
        const updatedChambers = [...chambers];
        updatedChambers[chamberIndex].levels.splice(levelIndex, 1);
        setChambers(updatedChambers);
    };

    const handleFieldChange = (chamberIndex: number, levelIndex: number, field: keyof Level, value: number) => {
        const updatedChambers = [...chambers];
        const level = updatedChambers[chamberIndex].levels[levelIndex];
        level[field] = value;

        // Auto-calculate totalQty and calibrationQty
        if (field === "levelHeight" || field === "levelAdditionQty") {
            const levels = updatedChambers[chamberIndex].levels;
            const previousLevel = levels[levelIndex - 1] || { levelTotalQty: 0, levelHeight: 0 };
            level.levelTotalQty = previousLevel.levelTotalQty ? previousLevel.levelTotalQty + level.levelAdditionQty : 0 + level.levelAdditionQty;
            const heightDiff = level.levelHeight - previousLevel.levelHeight;
            level.levelCalibrationQty = heightDiff > 0 ? level.levelAdditionQty / heightDiff : 0;
        }

        setChambers(updatedChambers);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const filteredChambers = chambers.map((chamber) => ({
            chamberId: chamber.chamberId,
            levels: chamber.levels.map(({ levelNo, levelHeight, levelAdditionQty }) => ({
                levelNo,
                levelHeight,
                levelAdditionQty,
            })),
        }));

        const bowserData = {
            regNo: bowserRegNo,
            chambers: filteredChambers,
        };

        setIsLoading(true);

        try {
            const method = id ? "PUT" : "POST";
            const url = id ? `${BASE_URL}/bowsers/${id}` : `${BASE_URL}/bowsers/create`;

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bowserData),
            });

            if (!response.ok) {
                throw new Error("Failed to save Bowser");
            }

            alert(id ? "Bowser updated successfully!" : "Bowser created successfully!");
        } catch (error) {
            console.error("Error saving Bowser:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault()
        if (confirm("Are you sure to Want to delete this bowser?\nThis action can't be Un done")) {
            try {
                setIsLoading(true)
                const response = await fetch(`${BASE_URL}/bowsers/${id}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                })
                if (!response.ok) {
                    throw new Error("Couldn't delete")
                } else {
                    alert('Bowser deleted successfully')
                    window.history.back()
                }
            } catch (err) {
                console.error("Error deleting bowser: ", err)
            } finally {
                setIsLoading(false)
            }
        }
    }

    return (
        <div className="flex justify-center items-center bg-background mt-6 py-4 min-h-full">
            {isLoading && <Loading />}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>{id ? "Update Bowser" : "Create Bowser"}</CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        {/* Bowser Registration Number */}
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="bowserRegNo">Bowser Registration Number</Label>
                            <Input
                                id="bowserRegNo"
                                value={bowserRegNo}
                                onChange={(e) => setBowserRegNo(e.target.value)}
                                required
                            />
                        </div>

                        {/* Chambers */}
                        <Accordion type="multiple">
                            {chambers.map((chamber, chamberIndex) => (
                                <AccordionItem key={chamberIndex} value={`chamber-${chamberIndex}`}>
                                    <AccordionTrigger className="flex justify-between items-center">
                                        <span>{chamber.chamberId}</span>
                                        <span
                                            onClick={() => handleRemoveChamber(chamberIndex)}
                                            className="ml-2 p-3 border rounded-md"
                                        >
                                            Remove
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="flex flex-col space-y-4 mt-4">
                                            {/* Levels */}
                                            {chamber.levels.map((level, levelIndex) => (
                                                <div key={levelIndex} className="flex flex-wrap items-center space-x-4 pb-4 border-b">
                                                    {/* Level Number */}
                                                    <div>
                                                        <Label htmlFor={`levelNo${levelIndex}`}>Level Number</Label>
                                                        <Input
                                                            id={`levelNo${levelIndex}`}
                                                            type="number"
                                                            placeholder="Level No"
                                                            value={level.levelNo}
                                                            readOnly
                                                            className="w-full"
                                                        />
                                                    </div>

                                                    {/* Level Height */}
                                                    <div>
                                                        <Label htmlFor={`levelHeight${levelIndex}`}>Level Height (cm)</Label>
                                                        <Input
                                                            id={`levelHeight${levelIndex}`}
                                                            type="number"
                                                            placeholder="Height"
                                                            value={level.levelHeight}
                                                            onChange={(e) =>
                                                                handleFieldChange(chamberIndex, levelIndex, "levelHeight", +e.target.value)
                                                            }
                                                            className="w-full"
                                                        />
                                                    </div>

                                                    {/* Level Addition Quantity */}
                                                    <div>
                                                        <Label htmlFor={`levelAdditionQty${levelIndex}`}>Addition Qty</Label>
                                                        <Input
                                                            id={`levelAdditionQty${levelIndex}`}
                                                            type="number"
                                                            placeholder="Addition Qty"
                                                            value={level.levelAdditionQty}
                                                            onChange={(e) =>
                                                                handleFieldChange(chamberIndex, levelIndex, "levelAdditionQty", +e.target.value)
                                                            }
                                                            className="w-full"
                                                        />
                                                    </div>

                                                    {/* Total Quantity (Read-Only) */}
                                                    <div>
                                                        <Label htmlFor={`levelTotalQty${levelIndex}`}>Total Qty</Label>
                                                        <Input
                                                            id={`levelTotalQty${levelIndex}`}
                                                            type="number"
                                                            placeholder="Total Qty"
                                                            value={level.levelTotalQty}
                                                            readOnly
                                                            className="w-full"
                                                        />
                                                    </div>

                                                    {/* Calibration Quantity (Read-Only) */}
                                                    <div>
                                                        <Label htmlFor={`levelCalibrationQty${levelIndex}`}>Calibration Qty (lt./cm)</Label>
                                                        <Input
                                                            id={`levelCalibrationQty${levelIndex}`}
                                                            type="number"
                                                            placeholder="Calibration Qty"
                                                            value={level.levelCalibrationQty?.toFixed(2)}
                                                            readOnly
                                                            className="w-full"
                                                        />
                                                    </div>

                                                    {/* Remove Level Button */}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => handleRemoveLevel(chamberIndex, levelIndex)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            ))}

                                            <Button
                                                type="button"
                                                onClick={() => handleAddLevel(chamberIndex)}
                                                className="mt-2"
                                            >
                                                Add Level
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>

                        <Button type="button" onClick={handleAddChamber}>
                            Add Chamber
                        </Button>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-4">
                        {id && <Button variant="destructive" onClick={(e) => handleDelete(e)}>Delete</Button>}
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
