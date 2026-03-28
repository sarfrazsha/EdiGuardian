import React from 'react';
import { Button } from 'react-bootstrap';

const RoleButton = ({ role, onClick }) => {
  return (
    <Button
      variant="light"
      size="lg"
      className="p-4 shadow-lg fw-bold text-uppercase w-100"
      style={{ minWidth: '200px', opacity: 0.9 }}
      onClick={onClick}
    >
      {role}
    </Button>
  );
};

export default RoleButton;
