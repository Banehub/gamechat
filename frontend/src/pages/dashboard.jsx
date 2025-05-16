import styles from "../styles/dashboard.module.css";
import Background from "../components/background";
import SideMenu from "../components/sideMenu";

export default function Dashboard() {
    return (
        <div>
            <Background />
            <SideMenu />
        </div>
    )
}