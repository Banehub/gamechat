import styles from "../styles/modal.module.css";


export default function RegisterModal() {
    return (
        <div className={styles.modal}>
         <div className={styles.modal_content}>
            {/* <h1>Login</h1> */}
            <form className={styles.modal_form}>
                <input type="text" placeholder="Username" />
                <input type="text" placeholder="Email" />
                <input type="text" placeholder="Phone Number" />
                <input type="password" placeholder="Password" />
                <input type="password" placeholder="Confirm Password" />
                <button type="submit">Register</button>
                <p className={styles.modal_form_p}>Already have an account? <a href="/">Login</a></p>
            </form>
          
         </div>
        </div>
    )
}
