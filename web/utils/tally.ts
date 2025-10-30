import { DispensesRecord, XMLVariables } from "@/types";
import { createTallyPostableXML } from "./post";
import { BASE_URL } from "@/lib/api";

export const getDateInTallyFormate = (dateString: string | Date) => {
  let date = typeof dateString === "string" ? new Date(dateString) : dateString;
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Add 1 since months are 0-based
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

export const getTimeInTallyFormate = (timeString: string | Date) => {
  let date = typeof timeString === "string" ? new Date(timeString) : timeString;
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}${minutes}00000`;
};


export const postToTally = async ({ postRecord, variables }: { postRecord: DispensesRecord, variables: XMLVariables }) => {
  const recordId = postRecord._id;

  const storedUserJson = localStorage.getItem("adminUser");
  let userDetails = { id: "", name: "", phoneNumber: "" };
  if (storedUserJson) {
    const storedUser = JSON.parse(storedUserJson);
    userDetails = {
      id: storedUser.userId || "",
      name: storedUser.name || "",
      phoneNumber: storedUser.phoneNumber || "",
    };
  }

  if (!storedUserJson || storedUserJson === "undefined" || storedUserJson === "{}" || storedUserJson === null) {
    return { success: false, error: "User details not found. Please log in again." };
  }

  const xml = await createTallyPostableXML(postRecord, variables);

  try {
    const response = await fetch('http://localhost:4000/tally', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });

    const result = await response.json();

    if (result.success && result.data?.vchNumber) {
      try {
        const postResponse = await fetch(`${BASE_URL}/listDispenses/post/${recordId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ by: { id: userDetails?.id, name: userDetails?.name } }),
        });

        if (!postResponse.ok) {
          const errText = await postResponse.text(); // handle non-JSON errors gracefully
          throw new Error(`Backend responded with ${postResponse.status}: ${errText}`);
        }

        const postResponseData = await postResponse.json();

        return {
          success: true,
          result,
          postResponseData,
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Failed to update record in DB: ${err.message || 'Unknown error'}`,
        };
      }
    } else {
      return { success: false, error: result?.message || "Failed to sync with Tally" };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Tally Bridge error" };
  }
};