"use client";

import Loading from "@/app/loading";
import axios from "axios";
import TripCalculationModal from "@/components/exclusive/TripCalculationModal";
import { WholeTripSheet } from "@/types";
import { useState, useEffect } from "react";
import { BASE_URL } from "@/lib/api";

const SettlementPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const [id, setId] = useState<string>("");
  useEffect(() => {
    (async () => {
      const { id } = await params;
      setId(id);
    })();
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<WholeTripSheet>();
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/tripSheet/${id}`);
        setRecord(response.data);
        console.log(response.data);
      } catch (error) {
        console.error("Error fetching records:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  return (
    <div className="">
      {(!record || loading) && <Loading />}
      {record && <TripCalculationModal record={record} />}
    </div>
  );
};

export default SettlementPage;
