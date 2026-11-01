import React from 'react';
import type { Contract } from '../../../../store/contractStore';
import OfficialContractPrintView from '../OfficialContractPrintView';

interface ContractLegalAndPrintTabProps {
  contract: Contract;
}

export default function ContractLegalAndPrintTab({
  contract,
}: ContractLegalAndPrintTabProps) {
  return <OfficialContractPrintView contract={contract} />;
}

