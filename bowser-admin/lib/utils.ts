import moment from 'moment';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from 'axios';
import { BASE_URL } from './api';
import xlsx from "json-as-xlsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (dateInput: string | Date | null): string => {
  if (dateInput == null) return ""
    const date = moment(dateInput);
  return `${date.format('DD-MM-YY')}, ${date.format('hh:mm A')}`;
};

export const getDriversApp = async () => {
  try {
    let response = await axios.get(`${BASE_URL}/updates?appName=drivers`)
    return response.data[0]
  } catch (error) {
    console.log(error)
  }
}

export const getTallyBridgeApp = async () => {
  try {
    let response = await axios.get(`${BASE_URL}/updates?appName=tally-bridge`)
    return response.data[0]
  } catch (error) {
    console.log(error)
  }
}

export const downloadExcel = (data: any[], fileName: string) => {
  const settings = {
    fileName: fileName,
    extraLength: 3,
    writeOptions: {},
  };
  console.log("Downloading Excel file:", fileName);
  console.log("Data to be exported:", data);
  console.log(data.length)
  xlsx(data, settings);
};