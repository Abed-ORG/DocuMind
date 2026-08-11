import RobotPet from "./RobotPet";

function DashboardHeader({
  user,
}) {
  return (
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">Dashboard</p>
        <h1>
          Welcome
          {user?.firstName
            ? `, ${user.firstName}`
            : ""}
        </h1>
        <p>
          Review active document workspaces, processing volume, and
          recent activity.
        </p>
      </div>

      <RobotPet
        className="dashboard-robot-pet"
        listenForDashboardEvents
      />
    </header>
  );
}

export default DashboardHeader;
